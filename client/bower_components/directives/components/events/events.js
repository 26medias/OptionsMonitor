+(function(window) {
	window.appSettings.module.directive('noDecimals', function () {
		return function (scope, element, attrs) {
			element.bind("keyup", function (event) {
				if (this.value) {
					this.value = Math.floor(parseFloat(this.value));
					this.value = this.value.toString().replace(/[^0-9]/gmi, '');
					try {
						this.value = parseInt(Math.floor(this.value));
					} catch (e) {
						this.value = 0;
					}
				}
			});
		};
	});
	window.appSettings.module.directive('ngEnter', function () {
		return function (scope, element, attrs) {
			element.bind("keypress", function (event) {
				if (event.which === 13) {
					scope.$apply(function () {
						scope.$eval(attrs.ngEnter);
					});
					event.preventDefault();
					this.blur();
				}
			});
		};
	});
	window.appSettings.module.directive('ngInputChange', function () {
		return function (scope, element, attrs) {
			element.bind("input", function (event) {
				scope.$apply(function () {
					scope.$eval(attrs.ngInputChange);
				});
			});
		};
	});
	window.appSettings.module.directive('ngEscape', function () {
		return function (scope, element, attrs) {
			var target	= $(element);
			if (attrs.global) {
				target	= $(document);
			}
			target.on("keypress", function (event) {
				if (event.keyCode === 27) {
					scope.$apply(function () {
						scope.$eval(attrs.ngEscape);
					});
					event.preventDefault();
				}
			});
		};
	});
	window.appSettings.module.directive('ngNoclick', function () {
		return function (scope, element, attrs) {
			var target	= $(element);
			
			target.on("click", function (event) {
				//ftl.log("click!",event);
				event.stopImmediatePropagation();
			});
		};
	});
	window.appSettings.module.directive('ngLoadError', function () {
		return function (scope, element, attrs) {
			var target	= $(element);
			
			target.on("error", function (event) {
				target.attr('src', attrs.ngLoadError);
			});
		};
	});
	window.appSettings.module.directive('mxTrack', function () {
		return {
			link: 			function ($scope, element, attrs) {
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
				
				$(element).on('click', function() {
					//ftl.log("[MixPanel] Track: ",$scope.mxTrack, JSON.parse(angular.toJson($scope.mxData)));
					mixpanel.track($scope.mxTrack, JSON.parse(angular.toJson($scope.mxData)));
				});
				
			},
			scope:			{
				mxTrack:	'=',
				mxData:		'='
			}
		};
	});
	window.appSettings.module.directive('delta1', function () {
		return {
			link: 			function ($scope, element, attrs) {
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
				$scope.$watch('delta1', function() {
					if ($scope.delta1) {
						$scope.safeApply(function() {
							$scope.change	= ($scope.delta1-$scope.delta2)/$scope.delta2*100;
						});
					}
				});
				
			},
			replace:		true,
			transclude:		true,
			scope:			{
				delta1:		'=',
				delta2:		'='
			},
			template:	'<span ng-class="{\'text-danger\':change<=0,\'text-success\':change>0}"><span class="fa" ng-class="{\'fa-arrow-up\':change>0,\'fa-arrow-down\':change<=0}"></span> {{change|number:2}}%</span>'
		};
	});
	window.appSettings.module.directive('ngFluid', ['$timeout', function ($timeout) {
		return function ($scope, element, attrs) {
			
			var size;
			var propContainers;
			var props;
			
			var refresh	= function() {
				if (!$(element)[size.prop]) {
					//ftl.log(">",size.prop);
					//ftl.log(">",$(element)[size.prop]());
				}
				// Calculate the current ratio
				var ratio	= $(element)[size.prop]()/size[size.prop];
				
				_.each(props, function(prop) {
					var css = {};
					_.each(prop.css, function(v, k) {
						css[k]	= Math.round(v*ratio)+'px';
					});
					prop.el.css(css);
				});
			};
			
			$(window).on('resize', function() {
				refresh();
			});
			
			setInterval(function() {
				size			= $scope.$eval(attrs.ngFluid);
				if (!size.prop) {
					size.prop	= 'width';
				}
				propContainers	= $(element).find('[css]');
				props			= [];
				_.each(propContainers, function(container) {
					container	= $(container);
					props.push({
						el:		container,
						css:	$scope.$eval(container.attr('css'))
					});
				});
				refresh();
			}, 1000);
		};
	}]);
})(window);