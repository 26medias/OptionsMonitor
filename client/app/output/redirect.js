
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'redirect', function(response, req, res, status, routeSettings) {
		res.redirect(response);
		return true;
	});
	
	onload();
};