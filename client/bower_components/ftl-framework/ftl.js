(function() {
	
	
	var ftl	= function() {
		var scope = this;
		
		// Decode the csconf first (it's b64 that has been XORd then converted to hex)
		if (window._csconf && !_.isObject(window._csconf)) {
			window._csconf = this.b64hexdecrypt(window._csconf, "fleetwit");
		}
		
		this.lockbox		= {};
		this.addons			= {};
		this.timers			= {};
		this.plugins		= {
			'ajax-before':	[],	// Modify the ajax parameters
			'ajax-after':	[],	// Modify the ajex response
			'ajax-replace':	[],	// Conditionnaly replace the ajax method
			'before-exit':	[]	// Check if the page can be closed
		};
		this._jsonPrefix 	= "__JSON__";
		this.dataStore		= {};
		
		window.onbeforeunload = function() {
			var preventExit	= false;
			var message		= false;
			_.each(scope.plugins['before-exit'], function(callback) {
				var response = callback();
				if (response) {
					preventExit	= true;
					message		= response;
				}
			});
			if (preventExit) {
				return message;
			};
		}
		
		this.tagUser();
	};
	
	// Encrypted in-memory data safe
	ftl.prototype.safe	= function(prop, val) {
		var ekg = function(uuid, secret) {
			if (uuid.length != secret.length) {
				return false;
			}
			var i;
			var l = uuid.length;
			var output = [];
			for (i=0;i<l;i++) {
				output.push(
				String.fromCharCode((Math.floor((uuid.charCodeAt(i)+secret.charCodeAt(i))/2))));
			}
			return output.join('');
		}
		
		if (!val && val!==false) {
			// Read
			if (!this.lockbox[prop]) {
				return false;
			}
			var k = ekg(this.lockbox[prop].a, this.lockbox[prop].b);
			var c = CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(this.lockbox[prop].c, k, { format: JsonFormatter }));
			if (!_.isObject(c)) {
				try {
					c = JSON.parse(c);
				} catch(e) {
					this.error(e);
					//this.log('JSON CONTENT:', c);
				}
			}
			return c.v;
		} else {
			// Write
			var a = this.uuid();
			var b = this.uuid();
			var k = ekg(a, b);
			this.lockbox[prop] = {a:a,b:b,c:CryptoJS.AES.encrypt(JSON.stringify({v:val}), k, { format: JsonFormatter }).toString()};
			return this.lockbox[prop];
		}
	};
	
	ftl.prototype.b64hexdecrypt		= function(input, key) {
		
		var c = '';
		while (key.length < input.length/2) {
			key += key;
		}
		
		key		= key.toString();
		input	= input.toString();
		
		for(var i=0; i<input.length; i+=2) {	// All the hex values are on 2 chars
			var value1 = parseInt(input.substr(i,2), 16);	// hex to decimal
			var value2 = key[i/2].charCodeAt(0);
			
			var output = value1 ^ value2;
			
			c = c+String.fromCharCode(output);
			
		}
		return JSON.parse(window.atob(c));
	};
	ftl.prototype.tagUser		= function() {
		//?utm_source=df097b98255701a85ab04d1d77e8bce7&utm_medium=user&utm_campaign=ref
		
		//this.log("Tagging the user");
		
		var qs			= this.qs();
		//this.log("qs", qs);
		
		var cookieName	= 'utm_ref';
		var cookieData	= this.getCookie(cookieName);
		//this.log("cookieData", cookieData);
		
		if (!cookieData) {
			// Tag the user, if there is a campaign
			if (qs.utm_source || qs.utm_campaign || qs.utm_media || qs.utm_content) {
				this.setCookie(cookieName, qs, 365);
			}
		} else  {
			// There's a cookie... We do nothing
		}
		return true;
	};
	ftl.prototype.jpath = function(jpath, obj) {
		var parts		= jpath.split('.');
		var localCopy	= JSON.parse(JSON.stringify(obj));
		var pointer		= localCopy;
		_.each(parts, function(part, n) {
			if (!pointer.hasOwnProperty(part)) {
				return null;
			}
			pointer	= pointer[part];
			return true;
		});
		return pointer;
	}
	ftl.prototype.data		= function(name, value) {
		if (_.isNull(value) || _.isUndefined(value)) {
			return this.dataStore[name];
		}
		this.dataStore[name]	= value;
		return true;
	};
	ftl.prototype.timer		= function(interval, callback) {
		var scope		= this;
		var id			= _.uniqueId('timer-');
		if (!this.timers[interval]) {
			// Create the timer
			this.timers[interval]		= {
				timer:		false,
				callbacks:	{}
			};
			this.timers[interval].timer	= setInterval(function() {
				_.each(scope.timers, function(timers, msInterval) {
					_.each(scope.timers[msInterval].callbacks, function(callback, timerId) {
						callback();
					});
				});
			}, interval);
		}
		this.timers[interval].callbacks[id]	= callback;
		//this.log("this.timers",interval, this.timers);
		return {
			stop:	function() {
				delete scope.timers[interval].callbacks[id];
			},
			start:	function() {
				scope.timers[interval].callbacks[id]	= callback;
			}
		};
	};
	ftl.prototype.addon		= function(name, callback) {
		if (_.isNull(callback) || _.isUndefined(callback)) {
			return this.addons[name];
		}
		this.addons[name]	= callback();
		return true;
	};
	ftl.prototype.plugin	= function(type, callback) {
		if (!this.plugins.hasOwnProperty(type)) {
			return false;
		}
		this.plugins[type].push(callback);
		return true;
	};
	ftl.prototype.clone	= function(data) {
		try {
			return JSON.parse(JSON.stringify(data));
		} catch (e) {
			return {};
		}
	};
	ftl.prototype.log   = function() {
		var env	= window._csconf.env;
		if (document.location.hostname=='localhost' && window._csconf.env=='beta') {
			// Print up to 3 arguments
			console.log(arguments[0], arguments[1], arguments[2]);
		}
	};
	ftl.prototype.error   = function(e) {
		var env	= window._csconf.env;
		if (document.location.hostname=='localhost' && window._csconf.env=='beta') {
			// Print up to 3 arguments
			console.error(e);
		}
	};
	
	ftl.prototype.apicall	= function(options, callback) {
		var scope = this;
		
		options = _.extend({
			params:		{},
			url:		'/',
			resend:		false,
			callback:	function() {}
		}, options);
		
		if (options && options.params) {
			options.params	= JSON.parse(JSON.stringify(options.params));
		}
		
		//this.log("apicall",JSON.parse(JSON.stringify(options)));
		
		var stack = new window.pstack({
			async:	false
		});
		
		// Process the options using the plugins
		stack.add(function(done) {
			var substack = new pstack();
			// Apply the ajax-before plugins: Modifying the ajax options
			_.each(scope.plugins['ajax-before'], function(callback) {
				substack.add(function(_done) {
					// Handle both sync and async
					var response	= callback(options, function(_response) {
						options	= _response;
						_done();
					});
					if (response) {
						options	= response;
						_done()
					}
				});
			});
			
			substack.start(done);
		});
		
		stack.start(function() {
			//this.log(">> options", options);
			var i;
			var l = scope.plugins['ajax-replace'].length;
			var processed	= false;
			for (i=0;i<l;i++) {
				var replaceResponse	= scope.plugins['ajax-replace'][i](options);
				if (replaceResponse) {
					processed	= true;
					break;
				}
			}
			if (!processed) {
				scope._ajax(options);
			}
		});
	};
	ftl.prototype._ajax	= function(options) {
		var scope = this;
		
		options	= _.extend({
			/*onError:	function(error) {
				if (window.dialog) {
					window.dialog.open("error", error);
				}
			}*/
		}, options);
		
		var ajaxObj = {
			url: 		options.url,
			dataType: 	'json',
			type:		options.type||"POST",
			data:		options.params,
			headers:	options.headers,
			success: 	function(response, status, req){
				if (req && req.getResponseHeader('session-expires')) {
					// Save the session expiration date
					window.session_expires = new Date(parseInt(req.getResponseHeader('session-expires')));
					//this.log("SESSION EXPIRES", req.getResponseHeader('session-expires'));
				}
				//this.log("RESPONSE", status, response);
				if (response && response.error) {
					options.callback(response, status);
					//options.onError(response);
				} else {
					scope._ajax_after(response, options, status);
				}
			},
			error: function(jqXHR, data, errorThrown) {
				if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.code && jqXHR.responseJSON.code == "invalid_session") {
					// Invalid session, logout the user
					window.ftl.setCookie('auth', null);
					window.ftl.setCookie('profile', null);
					location.reload();
					return false;
				}
				options.onError({
					error:		true,
					message:	errorThrown
				});
			}
		};
		/*
		options.headers = _.extend({
			env:	window._csconf.env,	// Send the env for every call
			//ev:		2					// Encryption Version
		}, options.headers);
		
		if (options.headers) {
			ajaxObj.beforeSend	= function(request) {
				_.each(options.headers, function(v, k) {
					request.setRequestHeader(k, v);
				});
			}
		}
		*/
		
		
		if (options.json) {
			ajaxObj.data = JSON.stringify(ajaxObj.data);
		}
		
		
		if (options.crossDomain) {
			ajaxObj.crossDomain	= true;
			ajaxObj.contentType = "application/json";
		}
		
		//this.log("ajaxObj", ajaxObj);
		
		
		//this.log("ajaxObj", ajaxObj);
		$.ajax(ajaxObj);
	};
	ftl.prototype._ajax_after	= function(data, options, status) {
		var scope = this;
		
		//console.group();
		//this.log("_ajax_after", data, options, status);
		// Apply the ajax-after plugins: Modifying the ajax response
		_.each(scope.plugins['ajax-after'], function(callback) {
			data	= callback(data, options, status);
		});
		if (data.error && options.onError) {
			//this.log("done onError", data);
			//console.groupEnd()
			options.onError(data);
		} else {
			//console.groupEnd()
			//this.log("done callback", data);
			options.callback(data, status);
		}
	};
	ftl.prototype.getScope	= function() {
		return this.$scope;
	};
	ftl.prototype.qs = function() {
		var urlParams;
		var match,
		pl     = /\+/g,  // Regex for replacing addition symbol with a space
		search = /([^&=]+)=?([^&]*)/g,
		decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		query  = window.location.search.substring(1);
	
		urlParams = {};
		while (match = search.exec(query))
		urlParams[decode(match[1])] = decode(match[2]);
		return urlParams;
	};
	ftl.prototype._setCookie = function(name,value,days) {
		
		// encode JSON if required
		if (typeof value != "string" && typeof value != "number") {
			value = this._jsonPrefix+JSON.stringify(value);
		}
		
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; SameSite=Strict; expires="+date.toGMTString();
		} else{
			var expires = "";
		}

		if (document.location.hostname=='localhost') {
			document.cookie = name+"="+value+expires+"; path=/;";
		} else {
			document.cookie = name+"="+value+expires+"; path=/; secure;";
		}
		
		return true;
	};
	ftl.prototype.setCookie = function(name,value,days) {
		this._setCookie(name,value,days);
		this._setCookie(name+'_created',(new Date()).getTime(),days);
		return true;
	};
	ftl.prototype.getCookie = function(name) {
		try {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0;i < ca.length;i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0){
					var cookieValue = c.substring(nameEQ.length,c.length);
					//this.log("cookieValue",cookieValue.substr(0, this._jsonPrefix.length) == this._jsonPrefix, cookieValue.substr(this._jsonPrefix.length));
					// Now we decode if required
					if (cookieValue.substr(0, this._jsonPrefix.length) == this._jsonPrefix) {
						cookieValue = JSON.parse(cookieValue.substr(this._jsonPrefix.length));
						//this.log("cookieValue", cookieValue);
						return cookieValue;
					}
					return null;//cookieValue;
				}
			}
		} catch(e) {
			//this.log("Invalid Json Cookie:", name, cookieValue);
			return null;
		}
		return false;
	};
	ftl.prototype.getCookies = function() {
		var cookies = {};
		if (document.cookie && document.cookie != '') {
			var split = document.cookie.split(';');
			for (var i = 0; i < split.length; i++) {
				var name_value = split[i].split("=");
				name_value[0] = name_value[0].replace(/^ /, '');
				cookies[decodeURIComponent(name_value[0])] = decodeURIComponent(name_value[1]);
				if (cookies[decodeURIComponent(name_value[0])].substr(0, this._jsonPrefix.length) == this._jsonPrefix) {
					cookies[decodeURIComponent(name_value[0])] = JSON.parse(cookies[decodeURIComponent(name_value[0])].substr(this._jsonPrefix.length));
				}
			}
		}
		return cookies;
	};
	ftl.prototype.cookieAge = function(name) {
		var cookie = this.getCookie(name+'_created');
		
		if (!cookie) {
			return false;
		}
		
		var cookieCreation	= new Date(parseInt(cookie)).getTime();
		var timestamp		= new Date().getTime()
		
		return timestamp-cookieCreation;
	};
	ftl.prototype.start	= function(options, callback) {
		var instance = this;
		
		this.options	= _.extend({
			modules:	[]
		}, options);
		
		this.ng	= angular.module('ftl', this.options.modules);
		/*this.ng.config(['$sceDelegateProvider', '$compileProvider', function($sceDelegateProvider, $compileProvider) {
			$sceDelegateProvider.resourceUrlWhitelist([
				'self',
				window._csconf.allowDomain
			]);
			$compileProvider.debugInfoEnabled(false);
		}]);*/
		this.ng.config(['$compileProvider', function ($compileProvider) {
			$compileProvider.debugInfoEnabled(false);
		}]);
		/*if (!this.options.skipGoogle) {
			this.ng.config(['$mdThemingProvider', function($mdThemingProvider) {
				// Configure a dark theme with primary foreground yellow
				//Available palettes: red, pink, purple, deep-purple, indigo, blue, light-blue, cyan, teal, green, light-green, lime, yellow, amber, orange, deep-orange, brown, grey, blue-grey
				$mdThemingProvider.theme('default').primaryPalette('light-green').accentPalette('green').warnPalette('red');
			}]);
		}*/
		this.ng.controller('ftl', ['$scope', function ($scope) {
			
			// Current version
			$scope._version = '1.2.7';
			
			// Utilities
			$scope.safeApply = function(fn) {
				var phase = this.$root.$$phase;
				if(phase == '$apply' || phase == '$digest') {
					if(fn && (typeof(fn) === 'function')) {
						fn();
					}
				} else {
					this.$apply(fn);
				}
			};
			
			// Import the add-ons, then available via window.ftl.$scope.ftl[addon-name]
			$scope.ftl	= instance.addons;
			
			// Save a reference to the angular $scope
			instance.$scope	= $scope;
			
			callback($scope);
		}]);
		
		//this.log("this.ng",this.ng);
		
		angular.element(document).ready(function() {
			//this.log("Bootstrap", document);
			angular.bootstrap(document, ['ftl']);
		});
	}
	ftl.prototype.sid	= function() {
		return 'xxxxxx4xxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};
	ftl.prototype.uuid	= function() {
		return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};
	ftl.prototype.uuidv4	= function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	};
	
	window.ftl	= new ftl();
})();