
(function(window) {
	window.appSettings.module.directive('appMain', ['$compile', '$timeout', 'db', function ($compile, $timeout, db) {
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
			
			
			$scope.tabs	= {
				selected:	false,
				select:		function(id) {
					$scope.safeApply(function() {
						
						if ($scope.tabs.selected==id) {
							
						}
						
						$scope.tabs.selected	= id;
						
					});
				},
				is:		function(id) {
					return $scope.tabs.selected	== id;
				}
			};


			
			
			
			
			$scope.main = {
				showMenu:	false,
				init:	function() {
					var parts	 = document.location.hash.split("/");
					if (parts.length<2 || parts[1]=='') {
						document.location.hash = '/home';
					}
					var sidebarSettings = db.getState('sidebar');
					//console.log("sidebarSettings",sidebarSettings)
					if (sidebarSettings) {
						$scope.main.sidebar = sidebarSettings;
					}
				},
				sidebar: {
					betting: true,
					user: true
				},
				toggle:	function(name) {
					$scope.main.sidebar[name] = !$scope.main.sidebar[name];
					db.setState('sidebar', $scope.main.sidebar);
				},
				visible:	function(name) {
					return $scope.main.sidebar[name];
				},
				toggleMenu: function() {
					$scope.main.showMenu = !$scope.main.showMenu;
				},
				iconName: function(symbol) {
					return symbol.toLowerCase();
				}
			};
			
			
			
			// Navigation using the page url's hash value (document.location.hash)
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
				}
			};
			$scope.$watch('nav.getHash()', function(hashValue) {
				if (hashValue) {
					$scope.safeApply(function() {
						$scope.nav.parts = hashValue.split('/');
						$scope.main.showMenu = false;
					});
				}
			});
			
			
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
			templateUrl:	window.appSettings.path.components+'/app.html'
		};
	}]);
})(window);