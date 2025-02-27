var _				= require("underscore");
var path			= require("path");
var asyncReplace 	= require('async-replace');


module.exports = function(ftl, onload) {
	
	ftl.addRenderPlugin(function(content, data, params, callback) {
		
		var regex = new RegExp("{ftl:raw:(.*)}", "igm");
		
		asyncReplace(content, regex, function(match, expr, pos, html, done) {
			done(null, data[expr]);
		}, function(err, result) {
			callback(result);
		});
		
	});
	onload();
};