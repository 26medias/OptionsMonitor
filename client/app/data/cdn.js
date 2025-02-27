var _		= require("underscore");
var pstack	= require("pstack");
//var s3		= require('s3');
var md5File	= require('md5-file');
var path 	= require('path');
const {Storage} = require('@google-cloud/storage');

module.exports = function(ftl, onload) {
	
	//var client = s3.createClient(ftl.options.aws.client);
	
	var storage = new Storage({
		projectId:		'qs-trading',
		keyFilename:	process.env['GOOGLE_APPLICATION_CREDENTIALS']
	});
	
	var cdn = {
		google_upload:	function(options, callback) {
			
			options	=	 _.extend({
				file:	'local/file/path',
				dest:	'remote/file/path',
				bucket:	'',
				domain:	'',
				TTL:	900
			}, options);
			
			//ftl.log.log("google_upload", "options", options);
			
			var bucket	= storage.bucket(options.bucket);
			
			bucket.upload(options.file, {
				gzip:			true,
				destination:	options.dest,
				metadata:		{
					cacheControl: 'no-store'
				}
			}, function(err, response) {
				if (err) {
					console.error("unable to upload:", err.stack);
					callback(ftl.errorResponse("Upload Error", err));
					return false;
				}
				callback(options.domain+options.dest);
			});
		},
		google_uploadMany:	function(files, callback) {
			
			//ftl.log.log("CDN", "uploadMany", files);
			
			var uploadedFiles	= [];
			
			
			var stack = new pstack({
				progress:	'Uploading...',
				async:		false,
				batch:		25
			});
			
			_.each(files, function(filePair) {
				stack.add(function(done) {
					ftl.data.cdn.google_upload({
						file:	filePair.file,
						dest:	filePair.dest,
						bucket:	filePair.bucket,
						domain:	filePair.domain
					}, function(cdnUrl) {
						
						//ftl.log.log("CDN", "upload-response", cdnUrl);
						
						uploadedFiles.push({
							public:		filePair.dest,
							local:		filePair.file,
							remote:		cdnUrl,
							data:		filePair.data
						});
						done();
					});
					
					return true;
				});
			});
			
			stack.start(function() {
				callback(uploadedFiles);
				return true;
			});
			
			return this;
		},
		upload:	function(options, callback) {
			
			//ftl.log.log("cdn.upload()", "options", options);
			
			
			options	=	 _.extend({
				file:	'local/file/path',
				dest:	'remote/file/path',
				bucket:	ftl.options.cdn.bucket,
				root:	ftl.options.cdn.url,
				TTL:	900
			}, options);
			
			if (!options.bucket) {
				options.bucket	= ftl.options.aws.cdn.bucket;
			}
			
			//ftl.log.log("Upload","options", options);
			
			var uploader	= client.uploadFile({
				localFile:	options.file,
				s3Params:	{
					Bucket:	options.bucket,
					Key:	options.dest
				}
			});
			uploader.on('error', function(err) {
				console.error("unable to upload:", err.stack);
				callback(ftl.errorResponse("Upload Error", err));
			});
			uploader.on('progress', function() {
				if (uploader.progressMd5Amount!==0) {
					//console.log("progress", uploader.progressMd5Amount, uploader.progressAmount, uploader.progressTotal);
				}
			});
			uploader.on('end', function() {
				//ftl.log.log("cdn.upload()", "end", options.root+options.dest);
				callback(options.root+options.dest);
			});
		},
		remove:	function(options, callback) {
			options	=	 _.extend({
				file:	'local/file/path',
				bucket:	ftl.options.aws.cdn.bucket
			}, options);
			
			
		},
		sync:	function(options, callback) {
			options	=	 _.extend({
				dir:	'path/to/dir',
				remote:	'path/to/dir',
				bucket:	ftl.options.aws.cdn.bucket
			}, options);
			
			var uploader = client.uploadDir({
				localDir:		options.dir,
				deleteRemoved:	true,
				s3Params: {
					Bucket: options.bucket,
					Prefix: options.remote
				}
			});
			uploader.on('error', function(err) {
				console.error("unable to sync:", err.stack);
			});
			uploader.on('progress', function() {
				console.log("progress", uploader.progressAmount, uploader.progressTotal);
			});
			uploader.on('end', function() {
				console.log("done uploading");
				callback();
			});
		},
		download:	function(options, callback) {
			options	=	 _.extend({
				local:	'local/file/path',
				remote:	'remote/file/path',
				bucket:	ftl.options.aws.cdn.bucket
			}, options);
			
			var downloader = client.downloadFile({
				localFile:		options.dir,
				s3Params: {
					Bucket: options.bucket,
					Key: 	options.remote
				}
			});
			downloader.on('error', function(err) {
				console.error("unable to download:", err.stack);
			});
			downloader.on('progress', function() {
				console.log("progress", downloader.progressAmount, downloader.progressTotal);
			});
			downloader.on('end', function() {
				console.log("done downloading");
				callback();
			});
		},
		uploadMany:	function(files, callback) {
			
			//ftl.log.log("CDN", "uploadMany", files);
			
			var uploadedFiles	= [];
			
			
			var stack = new pstack({
				progress:	'Uploading...',
				async:		false,
				batch:		25
			});
			
			_.each(files, function(filePair) {
				stack.add(function(done) {
					/*ftl.log.log("CDN", "upload", {
						file:	filePair.file,
						dest:	filePair.dest,
						bucket:	filePair.bucket,
						root:	filePair.root
					});*/
					ftl.data.cdn.upload({
						file:	filePair.file,
						dest:	filePair.dest,
						bucket:	filePair.bucket,
						root:	filePair.root
					}, function(cdnUrl) {
						
						//ftl.log.log("CDN", "upload-response", cdnUrl);
						
						uploadedFiles.push({
							public:		filePair.dest,
							local:		filePair.file,
							remote:		cdnUrl,
							data:		filePair.data
						});
						done();
					});
					
					return true;
				});
			});
			
			stack.start(function() {
				callback(uploadedFiles);
				return true;
			});
			
			return this;
		},
		staticToCDN:	function(callback, options) {
			var scope = ftl;
			
			options = _.extend({
				query:	{}
			}, options);
			
			if (!scope.options.cdn || !scope.options.cdn.check) {
				callback();
				return false;
			}
			/*
				List the files
				Compute the MD5 for each
				Compute the global MD5
				Publish to CDN
			*/
			var opStack = new pstack();
			
			var md5		= {};
			var md5s	= [];
			var gmd5	= '';
			
			// Calculate the MD5
			opStack.add(function(done) {
				var md5Stack = new pstack();
				
				var publishableFiles	= scope.bowerdep.publishableFiles();
				
				_.each(publishableFiles, function(files, lib) {
					_.each(files, function(file) {
						md5Stack.add(function(completed) {
							md5File(file, function (error, sum) {
								if (error) {
									console.log("MD5 ERROR on ", file, ':\n', error);
									completed();
									return true;
								}
								md5[sum]	= file;
								md5s.push(sum);
								completed();
								return true;
							});
							return true;
						});
						return true;
					});
					return true;
				});
				
				md5Stack.start(function() {
					gmd5	= scope.md5(md5s.sort().join(''));
					done();
					return true;
				});
				return true;
			});
			
			
			// Check for unpublished md5s
			opStack.add(function(done) {
				var query	= {
					type:	'cdn-cache',
					domain:	scope.options.cdn.alias.libs,
					md5:	{
						$in:	md5s
					}
				};
				scope.mongo.find({
					collection:	'cdncache',
					fields:	{
						_id:		false
					},
					query:		query
				}, function(found) {
					
					scope.log.log("staticToCDN", "found", found.length);
					
					var foundMd5s	= _.map(found, function(item) {
						return item.md5;
					});
					
					var notFound	= _.filter(md5s, function(item) {
						return !_.contains(foundMd5s, item);
					});
					
					scope.log.sys(notFound.length," files need to be uploaded to the CDN");
					
					// Nothing that is not on the CDN already...
					if (notFound.length==0) {
						done();
						return true;
					}
					
					// Upload the missing libs
					var uploadList = [];
					
					_.each(notFound, function(md5hash) {
						var local		= md5[md5hash];
						var staticpath	= path.relative(path.normalize(scope.root+'/bower_components'), md5[md5hash]).replace(/\\/gm, '/');
						var cdnpath		= staticpath;
						uploadList.push({
							file:	local,
							dest:	cdnpath,
							bucket:	options.bucket,
							data:	{
								md5:		md5hash,
								local:		local,
								staticpath:	staticpath,
								cdnpath:	cdnpath
							}
						});
						return true;
					});
					
					ftl.data.cdn.uploadMany(uploadList, function(response) {
						
						var updateStack = new pstack();
						
						_.each(response, function(item) {
							
							// Replace with a CNAME domain and remove the protocol
							if (scope.options.cdn.alias.libs) {
								if (item && item.data && item.data.cdnpath) {
									item.remote	= scope.options.cdn.alias.libs+item.data.cdnpath;
								}
							}
							
							// Save
							updateStack.add(function(completed) {
								var cacheData	= {
									date:		new Date(),
									md5:		item.data.md5,
									groupMd5:	gmd5,
									minified:	false,
									file:	{
										local:		item.data.local,
										cdnpath:	item.data.cdnpath,
										staticpath:	item.data.staticpath
									},
									remote:		item.remote
								};
								cacheData = _.extend(cacheData, options);
								
								scope.mongo.update({
									collection:	'cdncache',
									query:	{
										type:				'cdn-cache',
										domain:				scope.options.cdn.alias.libs,
										'file.staticpath':	item.data.staticpath
									},
									data:		{
										$set:	cacheData
									}
								}, function() {
									completed();
									return true;
								});
								return true;
							});
							return true;
						});
						
						updateStack.start(done);
						
						return true;
					});
					return true;
					
				});
				return true;
			});
			
			opStack.start(callback);
			
		}
	}
	
	
	ftl.addon('data', 'cdn', cdn);
	ftl.data.cdn	= cdn;	// New notation
	
	onload();
};