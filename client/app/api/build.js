var _			= require("underscore");
var pstack		= require("pstack");
var path		= require("path");
var shortid		= require("shortid");
var fstool		= require("fs-tool");
var fs			= require("fs");
var minify		= require("minify");

module.exports = function(ftl, onload) {

	// Test JS build
	ftl.addRoute({
		pathname:	'/deploy/test',
		output:		'fjson',
		type:		['POST','GET'],
		encrypt:	false,
		method:		function(params, req, res, callback) {
			ftl.data.deploy.build({
				dependencies:	['directives'],
				env:			'dev',
				port:			'8100'
			}, function(buildResponse) {
				callback(buildResponse);
			});
		}
	});


	// Minify test
	ftl.addRoute({
		pathname:	'/minify',
		output:		'fjson',
		type:		['POST','GET'],
		encrypt:	false,
		method:		function(params, req, res, callback) {
			minify(params.file, function(error, data) {
				callback({
					output: data,
					error:	error,
					params:	params
				});
			});
		}
	});
	
	// Google Deploy
	ftl.addRoute({
		pathname:	'/deploy/google',
		output:		'fjson',
		type:		['POST','GET'],
		encrypt:	false,
		method:		function(params, req, res, callback) {
			ftl.log.log("/deploy/google", "params", params);
			ftl.data.deploy.google({
				dependencies:	['directives'],
				env:			params.env||'beta',
				port:			params.port||'8080',
				bucket:			params.bucket||ftl.options.deploy.bucket
			}, callback);
		}
	});
	
	// AWS deploy, on S3 + Cloudfront CDN
	ftl.addRoute({
		pathname:	'/build',
		output:		'fjson',
		type:		['POST','GET'],
		encrypt:	false,
		method:		function(params, req, res, callback) {
			
			params	= _.extend({
				env:		'beta',
				beta:		true,
				cdn:		true,
				optimize:	true,
				export:		true,
				slug:		true,
				port:		8140
			}, params);
			
			//ftl.log.log("Slug", "params", params);
			
			//params.beta	= true;
			
			var packages	= [
				['directives']
			]
			
			var settings = {
				cdnDomain:		ftl.options.cdn.url,
				cdnBucket:		ftl.options.cdn.bucket
			};
			
			var stack = new pstack();
			var buffer	= {
				output:	{},
				slugs:	{}
			};
			
			
			//ftl.log.log("Slug", "settings", settings);
			
			// Set the local variables
			stack.add(function(done) {
				// Update
				ftl.options.cdn.check			= true;
				ftl.options.dependencies.cdn	= true;
				ftl.options.dependencies.minify	= true;
				ftl.data.libCache				= false;
				done();
			});
			
			// Delete the slug
			stack.add(function(done) {
				fstool.file.remove(ftl.dir('slug.json'), function() {
					done();
				});
			});
			
			// Delete the libcache
			/*stack.add(function(done) {
				ftl.mongo.remove({
					collection:	'libcache'
				}, done);
			});*/
			
			// Delete the libcache
			stack.add(function(done) {
				fstool.file.listAll(ftl.dir('bower_components/minified'), ".js", function(files) {
					//ftl.log.log("Delete the libcache", "files", files);
					_.each(files, function(file) {
						fs.unlinkSync(file);
					});
					done();
				});
			});
			
			// Delete the minified JS files
			stack.add(function(done) {
				fstool.file.remove(ftl.dir('slug.json'), function() {
					done();
				});
			});
			
			// Generate the slugs
			_.each(packages, function(pkg) {
				stack.add(function(done) {
					//ftl.log.log("Slug", "Packaging", pkg);
					var dependencyManagement	= ftl.addon('data', 'dependency');
					var dependency				= new dependencyManagement(ftl.options.dependencies);
					ftl.log.log("Slug", "Status", "Getting the dependencies");
					//params.slug = f
					dependency.get("", {
						libs:			pkg,
						force:			true,
						upload:			true,
						cdnSettings:	settings
					}, params, function(files) {
						
						ftl.log.log("dependency.get", "files", files);
						
						buffer.slugs[pkg.sort().join('|')]	= {
							cdn:	settings.cdnDomain,
							files:	files
						};
						
						done();
					});
				});
			});
			
			// Write the slug
			stack.add(function(done) {
				buffer.output.slug	= {
					slugs:		buffer.slugs,
					date:		new Date(),
					params:		params,
					version:	buffer.version
				};
				
				fstool.file.writeJson(ftl.dir('slug.json'), buffer.output.slug, function() {
					done();
				});
			});
			
			
			// Optimize
			if (params.optimize) {
				stack.add(function(done) {
					ftl.log.log("Slug", "Status", "Optimizing the javascript");
					ftl.data.sys.optimizer.angular(settings, function(response) {
						buffer.output.optimization	= response;
						done();
					});
				});
			}
			
			// Export
			if (params.export) {
				stack.add(function(done) {
					
					ftl.log.log("Slug", "Status", "Caching the web page...");
					
					fstool.file.read("http://localhost:"+params.port+"/?slug=true&env="+params.env, function(response) {
						fstool.file.write(ftl.dir('../public/'+params.env+'.html'), response, function() {
							done();
						});
					});
				});
				
				// Upload
				stack.add(function(done) {
					
					// Find all the files in the public dir
					fstool.file.list(ftl.dir('../public'), function(files) {
						var uploadList = _.map(files, function(item) {
							return {
								file:	ftl.dir('../public'+'/'+item),
								dest:	/*ftl.options.cdn.path+'/public/'+*/path.basename(item),
								bucket:	ftl.options.cdn.bucket,
								root:	ftl.options.cdn.url
							};
						});
						
						//ftl.log.log("Optimizer", "uploadList", uploadList);
						
						ftl.data.cdn.uploadMany(uploadList, function(response) {
							//ftl.log.log("Optimizer", "uploadMany", response);
							done();
						});
					}); 
					
				});
			}
			
			
			// Compile
			stack.start(function() {
				ftl.log.log("Slug", "Status", "Slug Generated.");
				callback(buffer.output);
			});
			
			
		}
	});
	
	
	
	// Google Cloud Deploy: Storage with static site
	ftl.addRoute({
		pathname:	'/deploy',
		output:		'fjson',
		type:		['POST','GET'],
		encrypt:	false,
		method:		function(params, req, res, callback) {
			
			params	= _.extend({
				env:		'beta',
				beta:		true,
				cdn:		true,
				optimize:	true,
				export:		true,
				slug:		true,
				port:		8140
			}, params);
			
			//ftl.log.log("Slug", "params", params);
			
			//params.beta	= true;
			
			var packages	= [
				['directives']
			]
			
			var settings = {
				cdnDomain:		ftl.options.cdn.url,
				cdnBucket:		ftl.options.cdn.bucket
			};
			
			var stack = new pstack();
			var buffer	= {
				output:	{},
				slugs:	{}
			};
			
			
			//ftl.log.log("Slug", "settings", settings);
			
			// Set the local variables
			stack.add(function(done) {
				// Update
				ftl.options.cdn.check			= true;
				ftl.options.dependencies.cdn	= true;
				ftl.options.dependencies.minify	= true;
				ftl.data.libCache				= false;
				done();
			});
			
			// Delete the slug
			stack.add(function(done) {
				fstool.file.remove(ftl.dir('slug.json'), function() {
					done();
				});
			});
			
			// Delete the libcache
			/*stack.add(function(done) {
				ftl.mongo.remove({
					collection:	'libcache'
				}, done);
			});*/
			
			// Delete the libcache
			stack.add(function(done) {
				fstool.file.listAll(ftl.dir('bower_components/minified'), ".js", function(files) {
					//ftl.log.log("Delete the libcache", "files", files);
					_.each(files, function(file) {
						fs.unlinkSync(file);
					});
					done();
				});
			});
			
			// Delete the minified JS files
			stack.add(function(done) {
				fstool.file.remove(ftl.dir('slug.json'), function() {
					done();
				});
			});
			
			// Generate the slugs
			_.each(packages, function(pkg) {
				stack.add(function(done) {
					//ftl.log.log("Slug", "Packaging", pkg);
					var dependencyManagement	= ftl.addon('data', 'dependency');
					var dependency				= new dependencyManagement(ftl.options.dependencies);
					ftl.log.log("Slug", "Status", "Getting the dependencies");
					//params.slug = f
					dependency.get("", {
						libs:			pkg,
						force:			true,
						upload:			false,
						cdnSettings:	settings
					}, params, function(files) {
						
						ftl.log.log("dependency.get", "files", files);
						
						buffer.slugs[pkg.sort().join('|')]	= {
							cdn:	settings.cdnDomain,
							files:	files
						};
						
						done();
					});
				});
			});
			
			// Write the slug
			stack.add(function(done) {
				buffer.output.slug	= {
					slugs:		buffer.slugs,
					date:		new Date(),
					params:		params,
					version:	buffer.version
				};
				
				fstool.file.writeJson(ftl.dir('slug.json'), buffer.output.slug, function() {
					done();
				});
			});
			
			
			// Optimize
			if (params.optimize) {
				stack.add(function(done) {
					ftl.log.log("Slug", "Status", "Optimizing the javascript");
					ftl.data.sys.optimizer.angular(settings, function(response) {
						buffer.output.optimization	= response;
						done();
					});
				});
			}
			
			// Export
			if (params.export) {
				stack.add(function(done) {
					
					ftl.log.log("Slug", "Status", "Caching the web page...");
					
					fstool.file.read("http://localhost:"+params.port+"/?slug=true&env="+params.env, function(response) {
						fstool.file.write(ftl.dir('../public-'+params.env+'/index.html'), response, function() {
							done();
						});
					});
				});
				
				// Upload
				stack.add(function(done) {
					
					// Find all the files in the public dir
					fstool.file.list(ftl.dir('../public-'+params.env+''), function(files) {
						var uploadList = _.map(files, function(item) {
							return {
								file:	ftl.dir('../public-'+params.env+''+'/'+item),
								dest:	params.env+"/"+path.basename(item),
								bucket:	ftl.options.deploy.bucket,
								root:	ftl.options.deploy.domain
							};
						});
						
						//ftl.log.log("Optimizer", "uploadList", uploadList);
						
						ftl.data.cdn.google_uploadMany(uploadList, function(response) {
							//ftl.log.log("Optimizer", "uploadMany", response);
							done();
						});
					}); 
					
				});
			}
			
			
			// Compile
			stack.start(function() {
				ftl.log.log("Slug", "Status", "Slug Generated.");
				callback(buffer.output);
			});
			
			
		}
	});
	
	onload();
};