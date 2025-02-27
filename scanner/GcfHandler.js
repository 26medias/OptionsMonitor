var pstack		= require('pstack');
var _ 			= require('underscore');

var GcfHandler = function(app) {
	this.app		= app;
	this.logging	= false;

	// Core
	this.core		= {};
	this.core		= require('./ScannerAPI')(this.core);
}


GcfHandler.prototype.on = function(route, callback) {
	var scope = this;
	
	this.app.get(route, function(req, res) {
		
		var params	= _.extend({}, req.query, req.body);
		
		scope.parseParameters(params, function(params) {
			callback(params, function(response, headers) {
				scope.processResponse(response, headers, req, res);
			}, req, res, scope.core);
		});
		
	});
	
	this.app.post(route, function(req, res) {
		
		var params = _.extend({}, req.body, req.params)
		
		scope.parseParameters(params, function(params) {
			callback(params, function(response, headers) {
				scope.processResponse(response, headers, req, res);
			}, req, res, scope.core);
		});
		
		
	});
}

GcfHandler.prototype.parseParameters = function(params, callback) {
	if (params?._e) {
		callback(JSON.parse(params._e));
		return;
	}
	callback(params);
}

GcfHandler.prototype.processResponse = function(response, headers, req, res) {
	res.writeHead(200, headers);
	//console.log("> response",response);
	if (typeof response == "string") {
		res.end(response);
	} else {
		res.end(JSON.stringify(response, null, 4));
	}
}

module.exports = GcfHandler
