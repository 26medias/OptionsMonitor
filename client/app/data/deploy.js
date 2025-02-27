var _		= require("underscore");
var pstack	= require("pstack");
//var s3		= require('s3');
var md5File	= require('md5-file');
var fstool	= require('fs-tool');
var path 	= require('path');
var fs		= require('fs');
var minify	= require('minify');
var moment	= require('moment-timezone');
var obfuscator	= require('javascript-obfuscator');
var babel = require("@babel/core");

module.exports = function(ftl, onload) {
	
	
	var deploy = {
		google:	function(options, callback) {
			options	=	 _.extend({
				port:			8140,
				dependencies:	[],
				env:			'beta',
				bucket:			'test'
			}, options);
			
			var stack	= new pstack();
			var buffer	= {};
			
			// Build the files
			stack.add(function(done) {
				ftl.data.deploy.build(options, function(buildResponse) {
					buffer.jsFile	= buildResponse.slug;
					ftl.log.log("Obfuscating ", "jsFile", buffer.jsFile);
					done();
				});
			});
			
			// List the files
			stack.add(function(done) {
				fstool.file.list(ftl.dir('../build/'+options.env), function(files) {
					buffer.files = files;
					done();
				});
			});

			// Obfuscate the JS files
			stack.add(function(done) {
				ftl.log.log("Obfuscating ", '../build/'+options.env+'/*.js');
				fstool.file.read(buffer.jsFile, function(data) {
					var obfuscated	= obfuscator.obfuscate(data, {});
					fstool.file.write(buffer.jsFile, obfuscated.getObfuscatedCode(), function() {
						done();
					});
				});
			});

			// Upload the whole directory to Google Cloud Storage
			stack.add(function(done) {
				
				var uploadList = _.map(buffer.files, function(item) {
					return {
						file:	ftl.dir('../build/'+options.env+'/'+item),
						dest:	path.basename(item),
						bucket:	options.bucket,
						domain:	'https://'+options.bucket
					};
				});
				
				ftl.data.cdn.google_uploadMany(uploadList, function(response) {
					//ftl.log.log("Deploy", "uploadMany", response);
					done();
				});
			});
			
			stack.start(function() {
				callback(options);
			});
			
		},
		build:	function(options, callback) {
			options	=	 _.extend({
				port:			8140,
				dependencies:	[],
				env:			'beta',
				bucket:			'test'
			}, options);
			
			var jsOutputFilename = ftl.dir('../build/'+options.env+'/prospector-'+moment().format('YYYY-MM-DD-HH-mm')+ '-' + ftl.uuid() +'.js');
			
			
			/*
				- Create or empty the /build/{env} directory
				- Copy the files from /src/public to /build/{env}
				- Generate the javascript slug in /build/{env}
				- Generate the index.html in /build/{env}
				- Upload the content of /build/{env} to the storage bucket
			*/
			
			var stack	= new pstack();
			var buffer	= {};
			
			// Create or empty the /build/{env} directory
			stack.add(function(done) {
				fstool.directory.mkdir(ftl.dir('../'), 'build/'+options.env, done);
			});
			
			// Empty /build/{env}
			stack.add(function(done) {
				fstool.file.list(ftl.dir('../build/'+options.env), function(files) {
					var substack	= new pstack({async: true});
					_.each(files, function(file) {
						substack.add(function(_done) {
							fs.unlink(ftl.dir('../build/'+options.env+'/'+file), done);
						});
					});
					substack.start(done);
				});
			});
			
			// Copy the files from /src/public to /build/{env}
			stack.add(function(done) {
				fstool.file.list(ftl.dir('/public'), function(files) {
					var substack	= new pstack({async: true});
					_.each(files, function(file) {
						substack.add(function(_done) {
							fs.copyFile(ftl.dir('/public/'+file), ftl.dir('../build/'+options.env+'/'+file), done);
						});
					});
					substack.start(done);
				});
			});
			
			// Generate the javascript slug in /build/{env}
			stack.add(function(done) {
				ftl.data.deploy.generateSlug({
					comments:		true,
					dependencies:	options.dependencies,
					output:			jsOutputFilename
				}, function(response) {
					//ftl.log.log("generateSlug", "response", response);
					done();
				});
			});
			
			// Optimize AngularJS
			stack.add(function(done) {
				ftl.data.deploy.buildAngular({
					file:	jsOutputFilename,
					output:	jsOutputFilename
				}, function(response) {
					//ftl.log.log("buildAngular", "response", response);
					done();
				});
			});
			
			// Build a slug
			stack.add(function(done) {
				var slugData = {
					slugs:	{}
				}
				slugData.slugs[options.dependencies.sort().join('|')] = {
					cdn:		"",
					files:		["ui.css", path.basename(jsOutputFilename)],
					optimized:	true
				}
				fstool.file.writeJson(ftl.dir('slug.json'), slugData, function() {
					// Wait a bit
					setTimeout(function() {
						done();
					}, 800);
				});
			});
			
			// Build the HTML
			stack.add(function(done) {
				
				ftl.log.log("Slug", "Status", "Caching the web page...");
				
				fstool.file.read("http://localhost:"+options.port+"/?js="+jsOutputFilename+"&slug=true&env="+(options.env=='alpha'?'beta':options.env), function(response) {
					buffer.html = response;
					fstool.file.write(ftl.dir('../build/'+options.env+'/index.html'), response, function() {
						done();
					});
				});
			});
			
			// Delete the slug
			stack.add(function(done) {
				fs.unlink(ftl.dir('slug.json'), done);
			});
			
			stack.start(function() {
				callback({
					options:	options,
					html:		buffer.html,
					slug:		jsOutputFilename
				});
			});
			
		},
		generateSlug:	function(options, callback) {
			var stack	= new pstack();
			var buffer	= {};
			
			// Get the files we need to include
			stack.add(function(done) {
				var includes	= ftl.bowerdep.getFiles(options.dependencies);
				includes		= _.compact(includes);
				buffer.files	= includes;
				done();
			});
			
			// Minify
			stack.add(function(done) {
				var jsFiles	= _.filter(buffer.files, function(file) {
					return path.extname(file).toLowerCase() == '.js';
				});
				
				var substack	= new pstack({
					progress:	'Minifying...'
				});
				
				var jsbuffer	= "";

				const appendBuffer = function(data, hasComments, file) {
					if (hasComments) {
						jsbuffer	+= ';\n\n// '+ (file || 'custom script') +' (pre-minified)\n//-------------------------------\n'+data;
					} else {
						jsbuffer	+= ';'+data;
					}
				}

				_.each(jsFiles, function(file) {
					substack.add(function(_done) {
						fstool.file.read(file, function(data) {
							if (file.indexOf('/bower_components/directives/components/') !== -1) {
								babel.transform(data, {"presets": ["@babel/env"]}, function(error, result) {
									if (error) {
										console.log('Error on babel step: ', file, error);
									}
									minify.js(result.code, function(error, minifiedData) {
										if (error) {
											console.log('Error on minification step: ', file, error);
										}
										appendBuffer(minifiedData, options.comments);
										_done();
									});
								});
							} else {
								minify.js(data, function(error, minifiedData) {
									if (error) {
										console.log('Error on minification step: ', file, error);
									}
									appendBuffer(minifiedData, options.comments);
									_done();
								});
							}
						});
					});
				});
				
				substack.start(function() {
					fstool.file.write(options.output, jsbuffer, function() {
						callback(options.output);
					});
				});
			});
			
			stack.start(function() {
				callback(buffer);
			});
			
		},
		buildAngular:	function(options, callback) {
			
			
			var groups	= [{
				root:	'bower_components/directives/components/',
				files:	[
					'/*'
				],
				output:		'bower_components/directives/components/'
			}];
			
			var stack	= new pstack();
			
			var buffer	= {
				sid:		ftl.sid(),
				jsSlugs:	{},
				files:		[],
				ifiles:		{},
				uploadList:	[],
				parts:		[]
			};
			
			// Get the JS slugs
			stack.add(function(done) {
				if (path.extname(options.file)=='.js' && options.file.substr(0,5)=='slug-') {
					buffer.minified.push(options.file);
				}
				// Get the file content
				fstool.file.read(options.file, function(content) {
					buffer.jsSlugs[options.file]	= content;
					done();
				});
			});
			
			_.each(groups, function(setup) {
				// List the files, group them by ext
				stack.add(function(done) {
					var substack	= new pstack();
					_.each(setup.files, function(inputFile) {
						substack.add(function(_done) {
							fstool.file.listAll(ftl.dir(setup.root), ".html", function(files) {
								
								//ftl.log.log("Optimizer", "listAll", files);
								
								_.each(files, function(file) {
									buffer.files.push(file);
								});
								_done();
							});
						});
					});
					substack.start(function() {
						// Group by ext
						buffer.ifiles[setup.root]	= _.groupBy(buffer.files, function(item) {
							return path.extname(item);
						});
						
						//ftl.log.log("Optimizer", "ifiles["+setup.root+"]", buffer.ifiles[setup.root]);
						
						done();
					});
				});
					
				// Get the content of each html file
				stack.add(function(done) {
					var substack	= new pstack();
					
					// Read the templates
					_.each(buffer.ifiles[setup.root]['.html'], function(filename) {
						
						substack.add(function(_done) {
							fstool.file.read(filename, function(content) {
								var fileParts	= path.parse(filename);
								var relative	= path.relative(ftl.dir(''), fileParts.dir);
								var relative2	= path.relative(setup.root, relative);
								//ftl.log.log("Optimizer", (relative2?relative2+'/':'')+path.basename(filename), filename, relative);
								
								buffer.parts.push({
									filename:	(relative2?relative2+'/':'')+path.basename(filename),
									content:	content
								});
								_done();
							});
						});
					});
					
					substack.start(done);
					//substack.start(function(){});
				});
				
				// Update the slugs
				stack.add(function(done) {
					
					//ftl.log.log("Optimizer", "buffer.parts", buffer.parts);
					//ftl.log.log("Optimizer", "buffer.jsSlugs", buffer.jsSlugs);
					
					var substack	= new pstack();
					_.each(buffer.jsSlugs, function(jsContent,file) {
						substack.add(function(_done) {
							//ftl.log.log("Optimizer", file, "----------------------------------------------------------");
							_.each(buffer.parts, function(part) {
								// Find the index of the filename
								part.filename	= part.filename.replace(/\\/gmi,"/");
								var tplIndex	= buffer.jsSlugs[file].indexOf(part.filename);
								
								if (tplIndex==-1) {
									ftl.log.log("Optimize", "Not Found:", part.filename);
									return true;
								} else {
									//ftl.log.log("Optimize", "Found:", part.filename);
								}
								// Find the start
								var startIndex	= buffer.jsSlugs[file].lastIndexOf('templateUrl:', tplIndex);
								
								//ftl.log.log("Optimizer", part.filename, tplIndex, startIndex);
								
								// Update the template to load with the content instead
								buffer.jsSlugs[file]	= buffer.jsSlugs[file].substr(0, startIndex)+"template:"+JSON.stringify(part.content)+buffer.jsSlugs[file].substr(tplIndex+(part.filename.length)+1);
							});
							_done();
						});
					});
					substack.start(done);
					//substack.start(function() {});
				});
			});
			
			// Write the JS Slugs
			stack.add(function(done) {
				var substack	= new pstack();
				
				_.each(buffer.jsSlugs, function(content,file) {
					substack.add(function(_done) {
						// Write the file
						fstool.file.write(options.output, content, function() {
							_done();
						});
					});
				});
				
				substack.start(done);
			});
			
			stack.start(function() {
				callback({});
			});
			
		}
	}
	
	ftl.data.deploy	= deploy;
	
	onload();
};