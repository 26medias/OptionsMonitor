
var _		= require("underscore");
var request	= require("request");
var path	= require("path");
var pstack	= require("pstack");
var fstool	= require("fs-tool");
var fs		= require("fs");
var process = require('child_process');

module.exports = function(ftl, onload) {
	ftl.data.sys	= {};
	
	
	//heroku config:set 
	ftl.data.sys.env = function(callback) {
		fstool.file.read(ftl.dir('.env'), function(data) {
			var lines = data.split('\n');
			var output = [];
			_.each(lines, function(line) {
				if (line && line.trim()!='') {
					output.push(line);
				}
			});
			callback('heroku config:set '+output.join(' '));
		});
	}
	ftl.data.sys.version	= {
		get:	function(callback) {
			fstool.file.readJson(ftl.dir('version.js'), function(data) {
				if (!data || !data.version) {
					callback('0.0.1');
				} else {
					callback(data.version)
				}
			});
		},
		increment:	function(type, callback) {
			ftl.data.sys.version.get(function(version) {
				var parts	= version.split('.');
				switch (type) {
					default:
					case "build":
						parts[2]	= parseInt(parts[2])+1;
					break;
					case "minor":
						parts[1]	= parseInt(parts[1])+1;
					break;
					case "major":
						parts[0]	= parseInt(parts[0])+1;
					break;
				}
				
				fstool.file.writeJson(ftl.dir('version.js'), {
					version:	parts.join('.')
				},function() {
					ftl.log.log("SYS", "New Version:", parts.join('.'));
					if (callback) {
						callback({
							version:	parts.join('.')
						});
					}
				});
			});
		}
	};
	ftl.data.sys.optimizer	= {
		angular:	function(cdnSettings, callback) {
			
			var minified	= 'bower_components/minified/';
			
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
				buffer.minified	= [];
				fstool.file.list(ftl.dir(minified), function(files) {
					var substack	= new pstack();
					
					_.each(files, function(file) {
						substack.add(function(_done) {
							if (path.extname(file)=='.js' && file.substr(0,5)=='slug-') {
								buffer.minified.push(minified+file);
							}
							// Get the file content
							fstool.file.read(ftl.dir(minified+file), function(content) {
								buffer.jsSlugs[file]	= content;
								_done();
							});
						});
					});
					
					substack.start(done);
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
					//ftl.log.log("Optimizer", "buffer.jsSlugs[file]", buffer.jsSlugs[file]);
					
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
						var optimizedFilename	= path.basename(file, path.extname(file))+".optimized-"+buffer.sid+".js";
						
						fstool.file.write(ftl.dir(minified+path.dirname(file)+'/'+optimizedFilename), content, function() {
							// Add to the upload list
							buffer.uploadList.push({
								file:	ftl.dir(minified+path.dirname(file)+'/'+optimizedFilename),
								dest:	'minified/'+optimizedFilename,
								bucket:	cdnSettings.cdnBucket||ftl.options.cdn.bucket,
								root:	cdnSettings.cdnDomain||ftl.options.cdn.url
							});
							
							_done();
						});
					});
				});
				
				substack.start(done);
			});
			
			// Upload everything
			stack.add(function(done) {
				ftl.data.cdn.uploadMany(buffer.uploadList, function(response) {
					//ftl.log.log("Optimizer", "upload", response);
					done();
				});
			});
			
			// Update the slug
			stack.add(function(done) {
				fstool.file.readJson(ftl.dir("slug.json"), function(slugData) {
					if (!slugData) {
						done();
						return true;
					}
					_.each(buffer.minified, function(minified) {
						_.each(slugData.slugs, function(v,k) {
							_.each(v.files, function(file,n) {
								if (path.basename(minified)==path.basename(file)) {
									slugData.slugs[k].files[n]	= path.dirname(file)+"/"+path.basename(file, path.extname(file))+".optimized-"+buffer.sid+".js";
								}
							});
						});
					});
					//ftl.log.log("Optimizer", "slugData", slugData);
					
					// Write it back
					fstool.file.writeJson(ftl.dir("slug.json"), slugData, done);
				});
			});
			
			stack.start(function() {
				callback(buffer);
			});
			
		}
	};
	
	onload();
};