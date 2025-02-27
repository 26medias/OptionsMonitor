window.sharedData = {};

var simplepicker = new SimplePicker({
	zIndex: 5000
});

window.dialog = {
	visible:	true,
	front:	 	"",
	status:	 	{},
	payload:	{},
	open:	function(id, payload) {
		window.dialog.status[id]	= true;
		window.dialog.payload[id]	= payload;
		window.dialog.front			= id;
		window.Arbiter.inform("dialog.opened", {id:id, payload:payload});
	},
	close:	function(id) {
		window.dialog.status[id]	= false;
		window.dialog.front			= null;
		delete window.dialog.payload[id];
		window.Arbiter.inform("dialog.closed", {id:id});
	}
};

window.ftl.start({
	modules:	['directives']	// The angular dependencies (modules)
}, function($scope) {
	
});