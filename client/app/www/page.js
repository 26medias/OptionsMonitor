
var _		= require("underscore");
var fstool	= require("fs-tool");


module.exports = function(ftl, onload) {
	
	var base	= '/';

	var getClientsideConf	= function(res, params) {
		return {
			allowDomain:	ftl.options.angularDomain,
			mobile:			res.mobile?res.mobile:false,
			env:			params.env||ftl.options.env,
			local:			true,
			conf:			ftl.options.PUBLIC_SECRETS||{}
		};
	}
	
	ftl.addRoute({
		pathname:	base+'',
		output:		'html',
		type:		['POST','GET'],
		auth:		false,
		encrypt:	false,
		method:		function(params, req, res, callback) {
			
			ftl.render("app/www/views/ui.html", {
				pathname:			req.routePathname,
				cache:				false,
				libs:				['directives'],
				params:				params,
				port:				ftl.options.port,
				csconf:				getClientsideConf(res, params)
			}, params, callback);
		}
	});
	
	ftl.addRoute({
		pathname:	base+'site.webmanifest',
		output:		'manifest',
		type:		['POST','GET'],
		auth:		false,
		encrypt:	false,
		method:		function(params, req, res, callback) {
			
			fstool.file.readJson(ftl.dir('site.webmanifest'), function(response) {
				callback(response);
			});
		}
	});
	
	onload();
};