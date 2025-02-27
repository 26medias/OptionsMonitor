
var ftl			= require("./ftl");
var path 		= require('path');
var _ 			= require('underscore');


var setup	= {
	port:		8420,
	root:		path.normalize(path.resolve() +'/'),
	cdn:	{
		
	},
	sharedConf:	{},
	env:		'beta',
	debug_mode:	!process.env.PORT || process.env.debug
};

var app = new ftl(setup);

app.start();

// Process Monitoring
setInterval(function() {
	process.send({
		memory:		process.memoryUsage(),
		process:	process.pid
	});
}, 1000);

// Crash Management
if (!setup.debug_mode) {
	process.on('uncaughtException', function(err) {
		console.log("[ERROR:start]\n");
		console.log(err.stack);
		console.log("\n[ERROR:end]");
		process.exit(1)
		//global.monitor.log("Stats.error", err.stack);
	});
}