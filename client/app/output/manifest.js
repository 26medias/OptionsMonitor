
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'manifest', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", "application/manifest+json");
		res.status(status).send(response);
		return true;
	});
	
	onload();
};