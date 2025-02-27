
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'html', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", "text/html");
		res.status(status).send(response);
		return true;
	});
	
	onload();
};