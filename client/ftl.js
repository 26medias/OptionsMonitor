
var _				= require('underscore');
var express			= require('express');
var getCLIArgs 		= require('argcli');
var pstack			= require('pstack');
var fstool			= require('fs-tool');
var path 			= require('path');
var bowerdep 		= require('bowerdep');
var asyncReplace 	= require('async-replace');
var cachr			= require('cachr');
var fs				= require('fs');
var os				= require('os');
var pkgcloud		= require('pkgcloud');
var bodyParser		= require('body-parser-clone');
var uuid 			= require('./uuid.js');
var nodecrypto 		= require('crypto');
var multer			= require('multer');
var cookieParser	= require('cookie-parser');
var nameGenerator	= require('project-name-generator');
var favicon			= require('serve-favicon');
var md5File			= require('md5-file');
var nunjucks		= require("nunjucks");
var compression		= require('compression');
var shortid			= require('shortid');
var mobileDetect	= require('mobile-detect');
var spiderDetector	= require('spider-detector')

var ftl = function(options) {
	var scope = this;
	
	this.options	 	= _.extend({
		port:		80,
		directories:	['app/'],
		
		bower:	{
			root:	'bower_components/'
		},
		confCollection:	'_ftl'
	}, options);
	
	this.onStartCallbacks	= [];
	
	this._jsonPrefix	= '__JSON__';
	
	this.root			= this.options.root;
	
	this.modules		= {};
	
	this.crons			= {};
	
	this.files			= {};
	
	this.renderPlugins	= [];
	
	this.intervals		= {};
	
	this.data			= {};
	
	this.routes			= [];
	
	this.isGroupLeader	= false;
	
	this.plugins		= {
		'before-process':	[],
		'before-response':	[],
	};
	
	this.cache			= new cachr({
		TTL:	10
	});
	
	this.formats	= {
		reset:	37,
		color:	{
			red:	31,
			green:	32,
			yellow:	33,
			blue:	34,
			magenta:35,
			cyan:	36,
			white:	37
		},
		bg:	{
			red:	41,
			green:	42,
			yellow:	43,
			blue:	44,
			magenta:45,
			cyan:	46,
			white:	47
		}
	}
	this.log			= {
		sys:	function() {
			if (scope.options.disableLogs) {
				return false;
			}
			var args	= Array.prototype.slice.call(arguments);
			var output	= scope.log.format('bg.red', '/!\ FTL /!\\')+'  ';
			_.each(args, function(arg) {
				if (typeof arg == "object") {
					output	+= JSON.stringify(arg,null,4);
				} else {
					output	+= arg;
				}
			});
			console.log(output);
			return true;
		},
		log:	function() {
			if (scope.options.disableLogs) {
				return false;
			}
			var args	= Array.prototype.slice.call(arguments);
			var output	= scope.log.format('bg.blue', args[0])+' ';
			output	+= scope.log.format('bg.green', args[1])+' ';
			args	= args.slice(2);
			_.each(args, function(arg) {
				if (typeof arg == "object") {
					output	+= JSON.stringify(arg,null,4)+' ';
				} else {
					output	+= arg+' ';
				}
			});
			console.log(output);
			return true;
		},
		response:	function() {
			if (scope.options.disableLogs) {
				return false;
			}
			var args	= Array.prototype.slice.call(arguments);
			console.log("\033[35m");
			_.each(args, function(arg) {
				console.log(JSON.stringify(arg,null,4));
			});
			console.log("\033[37m");
			return true;
		},
		info:	function() {
			if (scope.options.disableLogs) {
				return false;
			}
			var args	= Array.prototype.slice.call(arguments);
			console.log("\033[32m");
			_.each(args, function(arg) {
				console.log(JSON.stringify(arg,null,4));
			});
			console.log("\033[37m");
			return true;
		},
		error:	function() {
			if (scope.options.disableLogs) {
				return false;
			}
			var args	= Array.prototype.slice.call(arguments);
			console.log("\033[31m");
			_.each(args, function(arg) {
				console.log(JSON.stringify(arg,null,4));
			});
			console.log("\033[37m");
			return true;
		},
		format:	function(jpath, input) {
			var formatValue	= scope.jpath(jpath, scope.formats);
			if (!formatValue) {
				console.log("! Missing format: ", jpath);
				return input;
			}
			if (typeof input == "object") {
				return "\033["+formatValue+"m"+JSON.stringify(input, null, 4)+"\033[37m\033[40m";
			}
			return "\033["+formatValue+"m"+input+"\033[37m\033[40m";
		}
	};
	
	this.bowerdep	= new bowerdep({
		root:	path.normalize(this.root+'/'+this.options.bower.root)
	});
	
	this.nunjucks	= nunjucks;	// Share the ref
};

ftl.prototype.onStart = function(callback) {
	this.onStartCallbacks.push(callback);
};

ftl.prototype.start = function() {
	var scope	= this;
	
	// Create the app
	this.app	= express();
	
	// Timer
	this.app.use(function (req, res, next) {
		res._requestStarted	= new Date();
		next();
	});
	
	this.app.use(bodyParser.json({limit:'50mb'}));
	this.app.use(cookieParser());
	this.app.use(favicon(this.dir('/favicon.ico')));
	this.app.use(bodyParser.urlencoded({extended: true, limit:'50mb'}));
	this.app.use(compression());
	
	this.app.use(express.static(path.normalize(this.root+'/bower_components')));
	this.app.use(express.static(path.normalize(this.root+'/static')));
	
	// Custom Cookie parser
	this.app.use(function (req, res, next) {
		try {
			if (req.cookies && req.cookies.user) {
				if (req.cookies.user.substr(0, scope._jsonPrefix.length) == scope._jsonPrefix) {
					req.cookies.user = JSON.parse(req.cookies.user.substr(scope._jsonPrefix.length));
				}
			}
			req.getCookie = function(name) {
				var cookieValue	= req.cookies[name];
				if (!cookieValue) {
					return null;
				}
				if (cookieValue.substr(0, "__JSON__".length) == "__JSON__") {
					cookieValue = JSON.parse(cookieValue.substr("__JSON__".length));
				}
				return cookieValue;
			};
		} catch (e) {
			console.log("Invalid JSON in cookie",req.cookies.user);
		}
		next();
	});
	
	// Spider Detection
	this.app.use(spiderDetector.middleware())
	
	// Mobile Detection
	this.app.use(function (req, res, next) {
		var md = new mobileDetect(req.headers['user-agent']);
		
		res.mobile	= md.mobile();
		res.os		= md.os();
		res.md		= md;
		
		// For apps:
		//app:iPhone 5s, IOS 2.0.2, app 1.3.10, en, 320x568
		//app:[camelcase device name] [device version], [camelcase OS name] [OS version], app [app version], [locale], [screen size]
		
		next();
	});
	
	// Proper IP
	this.app.use(function (req, res, next) {
		var ipAddr = req.headers["x-forwarded-for"];
		
		//scope.log.log("IP", "x-forwarded-for", ipAddr);
		
		if (ipAddr){
			var list	= ipAddr.split(",");
			ipAddr		= list[0];
		} else {
			ipAddr		= req.connection.remoteAddress;
		}
		req.userIP	= ipAddr;
		
		//scope.log.log("IP", "req.userIP", req.userIP);
		next();
	});
	
	
	var stack	= new pstack({
		progress:	false,//'Starting...',
		async:		false
	});
	
	// Extend the settings from the ENV
	stack.add(function(done) {
		scope.extendFromEnv(function() {
			done();
			return true;
		});
		return true;
	});
	
	// Slug Support
	stack.add(function(done) {
		//scope.log.log("Dependencies","Slug","scope.options.local",scope.options.local);
		if (!scope.options.local) {
			fstool.file.exists(scope.dir('slug.json'), function(exists) {
				
				//scope.log.log("Dependencies","Slug","Exists: ",exists);
				
				if (!exists) {
					// No slug
					done();
				} else {
					// There's a slug
					fstool.file.readJson(scope.dir('slug.json'), function(slugData) {
						//console.log("slugData.cdn",slugData.cdn);
						if (slugData.cdn && scope.options.cdn && scope.options.cdn.alias) {
							scope.options.cdn.alias.libs	= slugData.cdn;
						}
						done();
						return false;
					});
				}
			});
		} else {
			done();
		}
		return true;
	});
	
	// Map the bower libraries
	stack.add(function(done) {
		console.log("** FTL: Bower: Mapping...");
		scope.bowerdep.map(function() {
			console.log("\n** FTL: Bower: \033[32m Success \033[37m");
			done();
			return true;
		});
		return true;
	});
	
	// List the directories
	_.each(this.options.directories, function(rootDirectory) {
		stack.add(function(done) {
			console.log("** FTL: Directory Listing: Searching...");
			fstool.directory.list(path.normalize(scope.root+'/'+rootDirectory), function(directories) {
				_.each(directories, function(directory) {
					scope.files[directory]	= {
						_path:	path.normalize(scope.root+'/'+rootDirectory+'/'+directory),
						files:	[]
					};
					return true;
				});
				console.log("** FTL: Directory Listing: \033[32m Success \033[37m");
				done();
				return true;
			});
			return true;
		});
		return true;
	});
	
	// Load the add-ons
	stack.add(function(done) {
		//console.log("** FTL: Add-ons: Searching...");
		var loadStack	 = new pstack({
			progress:	false, //'Loading the add-ons...',
			async:		false
		});
		
		_.each(scope.files, function(dir, rootDirectory) {
			loadStack.add(function(cb) {
				//console.log("** FTL: Add-ons: \033[33m "+dir._path+" \033[37m");
				fstool.file.list(path.normalize(dir._path), function(files) {
					if (files.length==0) {
						cb();
					} else {
						var reqStack	 = new pstack({
							progress:	false,
							async:		false
						});
						_.each(files, function(file) {
							scope.files[rootDirectory].files.push(path.normalize(dir._path+'/'+file));
							reqStack.add(function(onload) {
								var ext = path.extname(file);
								if (_.contains(['.js'], ext)) {
									//console.log("** FTL: Add-ons: --- \033[33m "+file+" \033[37m");
									//scope.log.log(">>>>>>>>>>>>> (inc) ", path.normalize(dir._path+'/'+file));
									require(path.normalize(dir._path+'/'+file))(scope, function(response) {
										//scope.log.log(">>>>>>>>>>>>> ", path.normalize(dir._path+'/'+file), response);
										onload();
									});
								} else {
									onload();
								}
								return true;
							});
							return true;
						});
						reqStack.start(cb);
					}
					return true;
				});
				return true;
			});
		});
		
		loadStack.start(function() {
			//console.log("** FTL: Add-ons: \033[32m Success \033[37m");
			scope.loaded = true;
			done();
			return true;
		});
		return true;
	});
	
	
	// 404 page
	stack.add(function(done) {
		if (process.env.PAGE_404_URL) {
			scope.app.use(function(req, res, next) {
				fstool.file.read(process.env.PAGE_404_URL, function(file) {
					res.set("Content-Type", "text/html");
					res.status(404).send(file);
					return true;
				});
				return true;
			});
		}
		done();
		return true;
	});
	
	
	// Execute the onStarts
	stack.add(function(done) {
		_.each(scope.onStartCallbacks, function(cb) {
			cb();
		});
		done();
		return true;
	});
	
	stack.start(function() {
		//scope.app.use(express.static(path.normalize(scope.root+'/bower_components')));
		console.log("");
		console.log("");
		console.log("   ██▓███   ██▀███   ▒█████    ██████  ██▓███  ▓█████  ▄████▄  ▄▄▄█████▓ ▒█████   ██▀███  \n  ▓██░  ██▒▓██ ▒ ██▒▒██▒  ██▒▒██    ▒ ▓██░  ██▒▓█   ▀ ▒██▀ ▀█  ▓  ██▒ ▓▒▒██▒  ██▒▓██ ▒ ██▒\n  ▓██░ ██▓▒▓██ ░▄█ ▒▒██░  ██▒░ ▓██▄   ▓██░ ██▓▒▒███   ▒▓█    ▄ ▒ ▓██░ ▒░▒██░  ██▒▓██ ░▄█ ▒\n  ▒██▄█▓▒ ▒▒██▀▀█▄  ▒██   ██░  ▒   ██▒▒██▄█▓▒ ▒▒▓█  ▄ ▒▓▓▄ ▄██▒░ ▓██▓ ░ ▒██   ██░▒██▀▀█▄  \n  ▒██▒ ░  ░░██▓ ▒██▒░ ████▓▒░▒██████▒▒▒██▒ ░  ░░▒████▒▒ ▓███▀ ░  ▒██▒ ░ ░ ████▓▒░░██▓ ▒██▒\n  ▒▓▒░ ░  ░░ ▒▓ ░▒▓░░ ▒░▒░▒░ ▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░░░ ▒░ ░░ ░▒ ▒  ░  ▒ ░░   ░ ▒░▒░▒░ ░ ▒▓ ░▒▓░\n  ░▒ ░       ░▒ ░ ▒░  ░ ▒ ▒░ ░ ░▒  ░ ░░▒ ░      ░ ░  ░  ░  ▒       ░      ░ ▒ ▒░   ░▒ ░ ▒░\n  ░░         ░░   ░ ░ ░ ░ ▒  ░  ░  ░  ░░          ░   ░          ░      ░ ░ ░ ▒    ░░   ░ \n              ░         ░ ░        ░              ░  ░░ ░                   ░ ░     ░     \n                                                      ░ Pancakeswap Pair Finder           \n");
		console.log("");
		console.log("");
		
		scope.server	= scope.app.listen(scope.options.port, function () {
			scope.log.info("FTL Framework Started", "Port "+scope.options.port);
		});
		return true;
	});
	
	return this;
};

ftl.prototype.extendFromEnv = function(callback) {
	var scope = this;
	
	var envStack = new pstack();
	
	if (process.env.DYNO) {
		// It's on heroku, we process the actual env
		// Do nothing
		console.log("-- LOCATION: Heroku");
	} else {
		console.log("-- LOCATION: Local");
		envStack.add(function(done) {
			// Load from the .env file
			fstool.file.read(scope.dir('/.env'), function(endData) {
				// split in lines
				var lines	= endData.split(/\r?\n/);
				
				// Update the local env
				var vars	= _.map(lines, function(line) {
					var parts	= line.split('=');
					var val = parts.slice(1).join('=');
					
					process.env[parts[0]]	= val;
					return {
						id:		parts[0],
						value:	val
					}
				});
				
				//scope.log.response("vars", vars);
				
				//scope.log.info("process.env",process.env);
				done();
				return true;
			});
			return true;
		});
	}
	
	// Merge the ENV
	envStack.add(function(done) {
		
		//scope.log.response("process.env", process.env);
		
		_.each(process.env, function(v, k) {
			//scope.log.info("process.env",v,k);
			// Split
			var parts	= k.split('.');
			//scope.log.response("parts", parts);
			
			if (parts[0]	== 'settings') {
				//scope.log.info("process.env",v,k);
				var localCopy	= JSON.parse(JSON.stringify(scope.options));
				var pointer		= localCopy;
				_.each(parts, function(part, n) {
					if (n==0) {
						return true;
					}
					if (!pointer.hasOwnProperty(part)) {
						pointer[part]	= {};
					}
					if (n==parts.length-1) {
						//pointer	= pointer[part];
						// Last part
						pointer[part]	= v;
						switch (pointer[part]) {
							case "true":
								pointer[part]	= true;
							break;
							case "false":
								pointer[part]	= false;
							break;
						}
						
						//console.log("##### ");
						//console.log("##### TEST", part, pointer[part], new RegExp('([^0-9]+)','gmi').test(pointer[part]));
						//console.log("##### ");
						
						//Fix to replace by a regex
						if (new RegExp('([^0-9]+)','gmi').test(pointer[part])) {
							// Contain more than numbers
							// Do nothing
						} else {
							// Only contains numbers, so we parse it into a float
							pointer[part]	= parseInt(pointer[part]);
							//console.log("----> CONVERTING", part, pointer[part]);
						}
						//scope.log.info("pointer", k, v, pointer, localCopy);
						// Save the conf
						scope.options	= localCopy;
						//console.log("pointer",pointer);
					} else {
						pointer	= pointer[part];
					}
					return true;
				});
			}
			return true;
		});
		done();
		return true;
		//scope.log.info("scope.options", scope.options);
		//console.log("scope.options",scope.options);
	});
	
	envStack.start(function() {
		callback();
		return true;
	});
};

ftl.prototype.jpath = function(jpath, obj, noClone) {
	var parts		= jpath.split('.');
	if (!noClone) {
		var localCopy	= JSON.parse(JSON.stringify(obj));
	} else {
		var localCopy	= obj;
	}
	var pointer		= localCopy;
	var i, l;
	l = parts.length
	for (i=0;i<l;i++) {
		if (!pointer.hasOwnProperty(parts[i])) {
			return null;
		}
		pointer	= pointer[parts[i]];
	}
	/*_.each(parts, function(part, n) {
		if (!pointer.hasOwnProperty(part)) {
			return null;
		}
		pointer	= pointer[part];
		return true;
	});*/
	return pointer;
}

ftl.prototype.dir = function(dirpath) {
	return path.normalize(this.root+'/'+dirpath);
};


ftl.prototype.render = function(filename, data, params, callback) {
	var scope	= this;
	/*
	// Get the file list
	if (libs) {
		var includes	= scope.bowerdep.getFiles(libs);
	}
	*/
	
	//this.log.info("path.normalize(this.root+'/'+filename)", path.normalize(this.root+'/'+filename));
	
	var filename	= path.normalize(this.root+'/'+filename);
	
	var cacheSign	= {
		filename:	filename,
		data:		data
	};
	
	if (data.cache && this.cache.exists(cacheSign)) {
		callback(this.cache.get(cacheSign));
	} else {
		
		/*
			Load the file's content
			Parse with the internal plugins
			Parse with nunjucks
		*/
		
		//scope.log.log("render", "data", data);
		
		if (data.nunjucksFirst) {
			fstool.file.read(filename, function(html) {
				
				var pluginStack	= new pstack({async:false, progress:false});
				
				pluginStack.add(function(done) {
					// Render with nunjucks
					html = nunjucks.renderString(html, data);
					
					//scope.log.log("renderString", "html", html);
					//scope.log.log("renderString", "data", data);
					//scope.log.log("renderString", "html", html);
					
					done();
					return true;
				});
				
				_.each(scope.renderPlugins, function(renderPlugin) {
					
					pluginStack.add(function(done) {
						renderPlugin(html, data, params, function(response) {
							html	= response;
							done();
							return true;
						});
					});
					return true;
				});
				
				pluginStack.start(function() {
					
					// Save in the cache
					scope.cache.set(cacheSign, html, scope.options.TTL.view*1000)
					
					callback(html);
					return true;
				});
				return true;
			});
			
		} else {
			fstool.file.read(filename, function(html) {
				
				var pluginStack	= new pstack({async:false, progress:false});
				
				_.each(scope.renderPlugins, function(renderPlugin) {
					
					pluginStack.add(function(done) {
						renderPlugin(html, data, params, function(response) {
							html	= response;
							//scope.log.log("render", "response", response);
							done();
							return true;
						});
						return true;
					});
					return true;
				});
				
				pluginStack.start(function() {
					
					// Render with nunjucks
					html = nunjucks.renderString(html, data);
					
					// Save in the cache
					scope.cache.set(cacheSign, html, 5000)
					
					callback(html);
					return true;
				});
				return true;
			});
		}
	}
};

ftl.prototype.cliArgs = function() {
	return getCLIArgs();
};

// Register an add-on
ftl.prototype.addon = function(type, name, value) {
	if (_.isUndefined(value)) {
		if (!this.modules.hasOwnProperty(type)) {
			return null;
		}
		return this.modules[type][name];
	}
	if (!this.modules.hasOwnProperty(type)) {
		this.modules[type]	= {};
	}
	
	this.modules[type][name]	= value;
	return this;
};

// Register an cron job
ftl.prototype.cron = function(type, interval, callback) {
	this.crons[type]	= callback;
	this.intervals['cron-'+type]	= setInterval(function() {
		callback();
		return true;
	}, interval);
	return this;
};

// Register a route
ftl.prototype.addRoute = function(routeSettings) {
	var scope	= this;
	
	this.routes.push(routeSettings);
	
	_.each(routeSettings.type, function(type) {
		switch (type) {
			default:
			case "GET":
				type	= 'get';
			break;
			case "POST":
				type	= 'post';
			break;
			case "PUT":
				type	= 'put';
			break;
			case "DELETE":
			case "DEL":
				type	= 'delete';
			break;
		}
		
		
		var routeExec	= function(req, res) {
			
			req.routePathname	= routeSettings.pathname;
			
			var responded	= false;
			
			var params		= _.extend({}, req.query, req.body, req.params);
			var paramsCopy	= JSON.parse(JSON.stringify(params));	// For logging
			var processStack = new pstack();
			
			// Apply each before-process plugin, to edit the parameters
			_.each(scope.plugins['before-process'], function(plugin) {
				processStack.add(function(done) {
					plugin(routeSettings, params, req, res, function(error, details) {
						if (error) {
							scope.output(details, req, res, 200, routeSettings.output, routeSettings);
							// Go no further
							//console.log("STOP THE STACK!");
							responded	= true;
							done(false);
							return false;
						} else {
							if (details && details.params) {
								params	= details.params;
							}
							done();
							return true;
						}
					});
				});
				return true;
			})
			processStack.start(function() {
				if (!responded) {
					// If we're still going (no error or interuption), apply the before-response plugins, to modify the output
					//scope.log.log("API CALL", routeSettings.pathname, params);
					routeSettings.method(params, req, res, function(response, status) {
						_.each(scope.plugins['before-response'], function(plugin) {
							response	= plugin(response, params, routeSettings, req, res);
							return true;
						})
						
						// Calculate how long it took to process the request
						res._requestEnded	= new Date();
						res._latency		= res._requestEnded.getTime()-res._requestStarted.getTime();
						
						// Respond
						scope.output(response, req, res, status, routeSettings.output, routeSettings);
						
						if (scope.options.latency && scope.options.latency.requests && res._latency > scope.options.latency.requests) {
							
							scope.log.sys("REQ LATENCY ALERT: ", scope.log.format('bg.magenta', res._latency+"ms"), " on ", scope.log.format('bg.magenta', routeSettings.pathname));
							
						}
						
						return true;
					});
				}
				return true;
			});
			return true;
		}
		
		
		if (routeSettings.upload) {
			var upload = multer({ dest: 'uploads/' });
			scope.app[type](routeSettings.pathname, upload.single(routeSettings.upload.name), function (req, res) {
				routeExec(req, res);
				return true;
			});
		} else {
			scope.app[type](routeSettings.pathname, function (req, res) {
				routeExec(req, res);
				return true;
			});
		}
	});
	return this;
};

// Register a render plugin
ftl.prototype.addRenderPlugin = function(renderCallback) {
	this.renderPlugins.push(renderCallback);
	return this;
};

// Register a render plugin
ftl.prototype.addPlugin = function(type, callback) {
	this.plugins[type].push(callback);
	return this;
};


ftl.prototype.getCdnContainerData = function(container, callback) {
	var scope	= this;
	
	if (this.cache.exists({cdn_container:container})) {
		callback(this.cache.get({cdn_container:container}));
	} else {
		this.cdnClient.getContainer(container, function (err, containerData) {
			containerData.url 			= containerData.cdnUri;
			scope.cache.set({cdn_container:container}, containerData, 1000*60*60*72);	// 72h
			callback(containerData);
		});
	}
	return this;
};

ftl.prototype.md5 = function(input) {
	var md5sum = nodecrypto.createHash('md5');
	md5sum.update(input);
	return md5sum.digest('hex');
}
ftl.prototype.uuid = function() {
	return this.md5(uuid.v4());
}
ftl.prototype.sid = function() {
	return shortid.generate();
}

// output
ftl.prototype.output = function(response, req, res, status, format, routeSettings) {
	if (!status) {
		status	= 200;
	}
	var outputMethod	= this.addon('output', format);
	if (typeof outputMethod == 'function') {
		outputMethod(response, req, res, status, routeSettings);
	} else {
		res.set("Content-Type", "application/json");
		res.status(status).send(JSON.stringify(response, null, 4));
	}
	return this;
};

ftl.prototype.errorResponse = function(response, data) {
	return _.extend({
		error:		true,
		message:	response
	},data);
	return this;
};

module.exports = ftl;
