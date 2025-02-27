var cluster		= require('cluster');
var os			= require('os');
var _ 			= require('underscore');
var path		= require('path');

var options = _.extend({
	timeout:	120000,		// if the process doesn't respond after this time, it is killed,
	online:		false,
	threads:	64
},processArgs());

if (process.env.threads) {
	options.threads	= parseInt(process.env.threads);
}
if (!process.env.PORT || !process.env.threads) {
	options.threads	= 1;
}

options.thread			= Math.min(options.threads, os.cpus().length);

var main;
main			= path.normalize(__dirname+'/main.js');

var i;
var workers			= {};
cluster.setupMaster({
    exec:	main
});

for (var i = 0; i < options.thread; i++) {
    createWorker();
}

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

var processTime 	= {};
function createWorker() {
	var worker 	= cluster.fork();
	console.log("New worker: ",worker.process.pid);
	workers[worker.process.pid] = {
		worker:		worker,
		lastCheck:	new Date().getTime()-1000	// allow boot time
	};
	worker.on('error', function(data) {
		console.log("> error",data);
	});
	worker.on('online', function(data) {
		console.log("> online",data);
	});
	worker.on('listening', function(data) {
		console.log("> listening",data);
	});
	worker.on('exit', function(data) {
		console.log("> exit",data);
	});
	worker.on('message', function(data) {
		// register the time
		var curTime = new Date().getTime();
		if (workers[worker.process.pid] && workers[worker.process.pid].lastCheck) {
			workers[worker.process.pid].data = data;
			workers[worker.process.pid].lastCheck = curTime;
		}
		
	});
	
};