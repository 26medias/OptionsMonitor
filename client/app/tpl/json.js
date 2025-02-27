var _				= require("underscore");
var path			= require("path");
var asyncReplace 	= require('async-replace');


module.exports = function(ftl, onload) {
	
	ftl.addRenderPlugin(function(content, data, params, callback) {
		var regex = new RegExp("{ftl:json:(.*)}", "igm");
		asyncReplace(content, regex, function(match, expr, pos, html, done) {
			done(null, data[expr]?JSON.stringify(data[expr]):'false');
		}, function(err, result) {
			callback(result);
		});
	});
	
	ftl.addRenderPlugin(function(content, data, params, callback) {
		var regex = new RegExp("{ftl:text:(.*)}", "igm");
		asyncReplace(content, regex, function(match, expr, pos, html, done) {
			done(null, data[expr]);
		}, function(err, result) {
			callback(result);
		});
	});
	
	onload();
};