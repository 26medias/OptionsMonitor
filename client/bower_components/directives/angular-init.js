+(function(window) {
	window.appSettings = {
		module:	angular.module('directives', ['ui.ace', 'ngJsonExplorer']),
		path: {
			components:	window._csconf&&window._csconf.cdn?window._csconf.cdn+'/directives/components':'/directives/components'
		}
	};
})(window);