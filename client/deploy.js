
var ftl			= require("./ftl");
var path 		= require('path');
var _ 			= require('underscore');
var express		= require('express');
var pstack		= require('pstack');
var fstool		= require('fs-tool');
var request		= require('request');

function processArgs() {
	var i;
	var args 	= process.argv.slice(2);
	var output 	= {};
	for (i=0;i<args.length;i++) {
		var l1	= args[i].substr(0,1);
		if (l1 == "-") {
			if (args[i+1] == "true") {
				args[i+1] = true;
			}
			if (args[i+1] == "false") {
				args[i+1] = false;
			}
			if (!isNaN(args[i+1]*1)) {
				args[i+1] = args[i+1]*1;
			}
			output[args[i].substr(1)] = args[i+1];
			i++;
		}
	}
	return output;
};

var options = _.extend({
	port:	8000+_.random(0,300),
	bucket:	'',
	env:	'beta'
}, processArgs());

options.bucket = options.env+".prospectordd.finance"

console.log("options",options);

var setup	= {
	port:			options.port,
	root:			path.normalize(path.resolve() +'/'),
	env:			options.env,
	deploy_bucket:	options.bucket,
	debug_mode:		false
};

var app = new ftl(setup);

app.start();

app.app.use(express.static(app.dir('public')));

app.onStart(function() {
	/*
	var dependencyManagement	= app.modules.data.dependency;
	var dependency				= new dependencyManagement({
		minify:	true,
		cdn:	false
	});
	*/
	
	var obj = {
		url:		'http://localhost:'+options.port+'/deploy/google',
		method: 	"POST",
		json:		options
	};
	
	console.log("obj", obj);
	
	var start = new Date().getTime();
	request(obj, function(error, response, body) {
		var end		= new Date().getTime();
		var latency	= end-start;
		console.log("------------------------");
		console.log("Build & Upload completed");
		console.log(latency+'ms');
		console.log("body",body);
		console.log("------------------------");
		process.exit()
	});
});
