
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'custom', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", response.mime);
		res.status(status).send(JSON.stringify(response.content));
		return true;
	});
	
	onload();
};