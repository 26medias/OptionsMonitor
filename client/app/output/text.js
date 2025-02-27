
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'text', function(response, req, res, status, routeSettings) {
		res.setHeader("ftl-local-group-name", ftl.localGroupName);
		res.status(status).send(response);
		return true;
	});
	
	onload();
};