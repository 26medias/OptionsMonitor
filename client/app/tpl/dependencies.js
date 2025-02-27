var _				= require("underscore");
var path			= require("path");
var asyncReplace 	= require('async-replace');
var minify			= require('minify');
var pstack			= require('pstack');
var fstool			= require('fs-tool');
var cachr			= require('cachr');
var md5File			= require('md5-file');

module.exports = function(ftl, onload) {
	
	onload();
	
	
	var dependencyManagement	= function(options) {
		this.options	= _.extend({
			minify:		true,
			cdn:		false,
			comments:	true
		}, options);
		
		this.cache			= new cachr({
			TTL:	1000*60*60*24	// 24h
		});
		
	};
	
	
	dependencyManagement.prototype.get = function(content /*html tpl*/, data /*page data, including libs*/, params /*page qs*/, callback) {
		
		//ftl.log.log("dependencyManagement", "params", params);
		
		// Cache?
		// Generate a signature
		var reqSign		= ftl.md5(data.libs.sort().join(''));
		var reqCache	= ftl.dir("temp/"+reqSign+".js")
		
		// Check if there is a memory cache
		if (ftl.data.libCache && ftl.data.libCache[reqSign]) {
			callback(ftl.data.libCache[reqSign]);
			return false;
		}
		
		var scope		= this;
		var buffer		= {};
		var stack		= new pstack();
		var skipCache	= false;
		
		// Check if there's a slug
		if (params.slug || ftl.options.useSlug !== false/* && (!ftl.options.local || ftl.options.useSlug)*/) {
			// Use a slug if there's one
			stack.add(function(done) {
				fstool.file.exists(ftl.dir('slug.json'), function(exists) {
					if (!exists) {
						// No slug
						ftl.log.log("dependencyManagement", "SLUG", "NOT FOUND");
						done();
					} else {
						ftl.log.log("dependencyManagement", "SLUG", " FOUND");
						// There's a slug
						fstool.file.readJson(ftl.dir('slug.json'), function(slugData) {
							// Do we have the current libs?
							var libId	= data.libs.sort().join('|');
							if (slugData.slugs[libId]) {
								if (!ftl.data.libCache) {
									ftl.data.libCache	= {};
								}
								ftl.data.libCache[reqSign]	= slugData.slugs[libId].files;
								// Return the files
								callback(ftl.data.libCache[reqSign]);
							} else {
								//ftl.log.log("/!\\ Slug","NOT FOUND", libId);
							}
							
							
							return false;
						});
					}
				});
			});
		} else {
			// Don't use a slug
		}
		
		// Check if that signature exists
		// This step simply loads the cdn-cache in memory
		/*stack.add(function(done) {
			ftl.mongo.get({
				collection:	'libcache',
				query:	{
					reqSign:	reqSign
				}
			}, function(cache) {
				if (!cache) {
					// Those fields are not in the mongo cache.
					// Do we have have the CDN cache loaded?
					if (_.keys(ftl.data.cdnFiles).length > 0) {
						// CDN Cache in memory... Moving on...
						done();
					} else {
						// CDN cache not in memory. Loading...
						// Load the CDN cache
						ftl.mongo.find({
							collection:	'cdncache',
							query:		{
								type:	'cdn-cache',
								domain:	ftl.options.cdn.url
							}
						}, function(docs) {
							ftl.data.cdnFiles	= {};
							_.each(docs, function(doc) {
								ftl.data.cdnFiles[doc.file.staticpath]	= doc.remote;
							});
							// CDN cache saved in memory now. Moving on...
							done();
						});
					}
				} else {
					// Cached in mongo. Returning the caches files.
					if (!ftl.data.libCache) {
						ftl.data.libCache	= {};
					}
					ftl.data.libCache[reqSign]	= cache.files;
					
					// Return
					callback(cache.files);
				}
			});
		});*/
		
		// List the local files
		stack.add(function(done) {
			scope.getLocalFiles(data, function(files) {
				buffer.files	= files;
				done();
			});
		});
		
		// No minification, get the public path for the files
		stack.add(function(done) {
			buffer.files	= _.map(buffer.files, function(filename) {
				return scope.publicPath(filename);
			});
			done();
		});
		
		
		// Returning the default files while the actual ones are in process...
		stack.start(function() {
			if (!skipCache && !data.force) {
				// Cache those files
				if (!ftl.data.libCache) {
					ftl.data.libCache	= {};
				}
				ftl.data.libCache[reqSign]	= buffer.files;
				
				// Save in mongo
				/*ftl.mongo.update({
					collection:	'libcache',
					query:	{
						reqSign:	reqSign
					},
					data:	{
						$set:	{
							date:		new Date(),
							reqSign:	reqSign,
							files:		buffer.files
						}
					}
				}, function() {});*/
			}
			
			callback(buffer.files);
		});
	};
	
	
	dependencyManagement.prototype.getFileMD5 = function(filename, callback) {
		var scope = this;
		if (this.cache.exists(filename)) {
			callback(this.cache.get(filename));
		} else {
			md5File(filename, function (error, sum) {
				if (error) {
					console.log("MD5 ERROR on ", filename, ':\n', error);
					callback('');
					return true;
				}
				scope.cache.set(filename, sum, 1000*60*60*24);
				callback(sum);
			});
		}
	};
	
	
	/*
		Utility
	*/
	dependencyManagement.prototype.generateFileID = function(files) {
		return ftl.md5(files.join('-'));
	};
	dependencyManagement.prototype.relativePath = function(filename) {
		return path.relative(ftl.root, filename).replace(/\\/gm, '/');
	};
	dependencyManagement.prototype.publicPath = function(filename) {
		return path.relative(path.normalize(ftl.root+'/bower_components'), filename).replace(/\\/gm, '/');
	};
	
	/*
		Process
	*/
	dependencyManagement.prototype.minify = function(files, output, callback) {
		var scope	= this;
		var stack	= new pstack({
			progress:	'Minifying...'
		});
		
		var buffer	= "";
		
		_.each(files, function(file) {
			stack.add(function(done) {
				if (file.substr(-7)=='.min.js') {
					fstool.file.read(file, function(data) {
						if (scope.options.comments) {
							buffer	+= ';\n\n// '+file+' (pre-minified)\n//-------------------------------\n'+data;
						} else {
							buffer	+= ';'+data;
						}
						done();
					});
				} else {
					minify(file, function(error, data) {
						if (scope.options.comments) {
							buffer	+= ';\n\n// '+file+'\n//-------------------------------\n'+data;
						} else {
							buffer	+= ';'+data;
						}
						done();
					});
				}
			});
		});
		
		stack.start(function() {
			fstool.file.write(output, buffer, function() {
				callback(output);
			});
		});
	};
	dependencyManagement.prototype.getLocalFiles = function(data, callback) {
		
		if (data.libs) {
			
			var cacheSig	= data.libs.sort().join('-');
			if (this.cache.exists(cacheSig)) {
				callback(this.cache.get(cacheSig));
				return false;
			}
			
			var includes	= ftl.bowerdep.getFiles(data.libs);
			includes	= _.compact(includes);
			
			// Cache the files
			this.cache.set(cacheSig, includes);	// Default TTL: 24h
			
			callback(includes);
		} else {
			callback([]);
		}
	};
	
	
	ftl.addon('data', 'dependency', dependencyManagement);
	
	
	
	
	ftl.addRenderPlugin(function(content, data, params, callback) {
		// Get the files
		if (data.libs) {
			
			// Create a new instance
			//ftl.log.response("ftl.options.dependencies", ftl.options.dependencies);
			var dependency	= new dependencyManagement(ftl.options.dependencies);
			
			//ftl.log.log("addRenderPlugin", "params", params);
			
			// Get the files
			dependency.get(content, data, params, function(files) {
				
				//ftl.log.log("addRenderPlugin", "dependency.get", files);
				
				
				//ftl.log.response("FINAL FILES", files);
				
				var all	= [];
				var css	= [];
				var js	= [];
				
				_.each(files, function(item) {
					if (!item.substr) {
						ftl.log.log("WTF", "item", item);
					}
					if (item && item.substr && item.substr(0,4) == 'http') {
						var protocolLess	= '//'+item.split('://')[1]
						switch (path.extname(item).toLowerCase()) {
							case ".js":
								all.push('<script src="'+protocolLess+'" type="text/javascript"></script>');
								js.push('<script src="'+protocolLess+'" type="text/javascript"></script>');
							break;
							case ".css":
								all.push('<link href="'+protocolLess+'" rel="stylesheet" />');
								css.push('<link href="'+protocolLess+'" rel="stylesheet" />');
							break;
						}
					} else {
						switch (path.extname(item).toLowerCase()) {
							case ".js":
								all.push('<script src="/'+item+'" type="text/javascript"></script>');
								js.push('<script src="/'+item+'" type="text/javascript"></script>');
							break;
							case ".css":
								all.push('<link href="/'+item+'" rel="stylesheet" />');
								css.push('<link href="/'+item+'" rel="stylesheet" />');
							break;
						}
					}
					
				});
				
				content	= content.replace('{ftl:include}', all.join('\n'));
				content	= content.replace('{ftl:include:css}', css.join('\n'));
				content	= content.replace('{ftl:include:js}', js.join('\n'));
				callback(content);
			});
			
		} else {
			callback(content);
		}
	});
};