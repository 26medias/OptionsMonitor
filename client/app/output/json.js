
module.exports = function(ftl, onload) {
	
	ftl.addon('output', 'fjson', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", "application/json");
		res.setHeader("ftl-local-group-name", ftl.localGroupName || 'unknown');
		res.status(status).send(JSON.stringify(response, null, 4));
		return true;
	});
	ftl.addon('output', 'json', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", "application/json");
		res.setHeader("ftl-local-group-name", ftl.localGroupName);
		res.status(status).send(JSON.stringify(response));
		return true;
	});
	ftl.addon('output', 'pkcs7', function(response, req, res, status, routeSettings) {
		res.set("Content-Type", "application/pkcs7-mime");
		res.status(status).send(JSON.stringify(response));
		return true;
	});
	
	onload();
};