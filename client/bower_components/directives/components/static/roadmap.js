(function(window) {
	
	window.appSettings.module.directive('uiRoadmap', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs, ctlr, transcludeFn) {

			// Utilities
			$scope.safeApply = function(fn) {
				var phase = this.$root.$$phase;
				if(phase == '$apply' || phase == '$digest') {
					if(fn && (typeof(fn) === 'function')) {
						fn();
					}
				} else {
					this.$apply(fn);
				}
			};
			
			$scope.qs		= window.ftl.qs();
			$scope.dialog	= window.dialog;

			var refreshClock	= setInterval(function() {
				$scope.safeApply(function() {});
			}, 1000);
			
			$scope.nav = {
				parts:	[],
				getHash:	function() {
					return document.location.hash;
				},
				is:	function(p, strict_match) {
					if (strict_match) {
						return document.location.hash == p;
					}
					return document.location.hash.substr(1, p.length) == p;
				},
				goto:	function(p) {
					document.location.hash = p;
				},
				set:	function(idx, v) {
					var p = $scope.nav.parts;
					p[idx] = v;
					document.location.hash = p.join('/');
				}
			};
			
			$scope.tabs	= {
				token: {},
				selected:	'info',
				select:		function(id) {
					$scope.safeApply(function() {
						if ($scope.tabs.selected!=id) {
							//$scope.nav.set(2, id);
						}
						$scope.tabs.selected	= id;
					});
				},
				is:		function(id) {
					return $scope.tabs.selected	== id;
				}
			};
			
			$scope.main = {
				loading:	false,
				type:		attrs.type,
				init:	async function() {

				}
			};
			
			$timeout(function() {
				$scope.main.init();
			});
            
			$scope.$on('$destroy', function() {
				clearInterval(refreshClock);
			});
		}
		return {
			link: 			component,
			scope:			{

			},
			templateUrl:	window.appSettings.path.components+'/static/roadmap.html'
		};
	}]);
})(window);