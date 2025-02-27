+(function(window) {
	window.appSettings.module.directive('flashClassOnClick', ['$compile', function ($compile) {
		var component = function(scope, element, attrs, ctlr) {
			$(element).on('click', function() {
				setTimeout(function() {
					$(element).addClass(attrs.flashClassOnClick);
					setTimeout(function() {
						$(element).removeClass(attrs.flashClassOnClick);
					}, 500);
				}, 500);
			});
		}
		return {
			link: 			component,
			replace:		false,
			scope:			{}
		};
	}]);
	window.appSettings.module.directive('markdown', ['$compile', function ($compile) {
		var component = function(scope, element, attrs, ctlr) {
			scope.$watch('markdown', function() {
				var text;
				if (!scope.markdown) {
					text = '';
				} else {
					text	= scope.markdown;
					
					if (!attrs.admin) {
						text	= text.replace(/</gmi,'&lt;');
					}
				}
				$(element).html(marked(text));
			});
			//scope.data	= $scope.data;	// Import from the controller
			
		}
		return {
			link: 			component,
			replace:		false,
			scope:			{
				markdown:	'='
			}
		};
	}]);
	window.appSettings.module.directive('ngIframe', function () {
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
				$scope.$watch('ngIframe', function() {
					if ($scope.ngIframe) {
						$(element).attr('src', $scope.ngIframe);
					}
				});
				
			},
			replace:		true,
			transclude:		true,
			scope:			{
				ngIframe:	'='
			}
		};
	});
	window.appSettings.module.directive('ngCopyValue', function () {
		return {
			link: 			function ($scope, element, attrs) {
				$(element).on('click', function() {
					this.select();
					document.execCommand('copy');
					alert("Link copied ot your clipboard");
				});
			},
			replace:		true,
			transclude:		true,
			scope:			{}
		};
	});
	window.appSettings.module.directive('elastic', ['$timeout',function($timeout) {
		return {
			restrict: 'A',
			link: function($scope, element) {
				$scope.initialHeight = 0;//$scope.initialHeight || element[0].style.height;
				var resize = function() {
					element[0].style.height = $scope.initialHeight;
					element[0].style.height = "" + element[0].scrollHeight + "px";
				};
				element.on("input change", resize);
				$timeout(resize, 0);
			}
		};
	}]);
	window.appSettings.module.directive('animateChanges', ['$timeout',function($timeout) {
		return {
			link: 			function ($scope, element, attrs) {
				
				var value;
				var cssClass	= 'bounceIn';
				var type		= attrs.type||'flash';
				var className	= attrs.classname||'color-blue';
				var duration	= attrs.duration||300;
				
				switch (type) {
					default:
					case "flash":
						$scope.$watch('animateChanges', function() {
							if ($scope.animateChanges || $scope.animateChanges===0) {
								$(element).removeClass(cssClass).addClass(cssClass).addClass(className).addClass('animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
									$(this).removeClass(cssClass).removeClass('animated');//.removeClass('color-blue');
								});
								setTimeout(function() {
									$(element).removeClass(className);
								}, duration);
								
							}
						});
					break;
					case "bg":
						$(element).css({
							transition:	'background-color 1s, color 1s'
						});
						$scope.$watch('animateChanges', function() {
							if ($scope.animateChanges || $scope.animateChanges===0) {
								$(element).addClass('change-bg-blue');
								setTimeout(function() {
									$(element).removeClass('change-bg-blue');
								}, 1000);
							}
						});
					break;
				}
				
			},
			scope:			{
				animateChanges:	'='
			}
		};
	}]);
	window.appSettings.module.directive('mask', ['$timeout',function($timeout) {
		return {
			link: function($scope, element, attrs) {
				$(element).on('input', function (e) {
					var x = e.target.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
					e.target.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
				});
			}
		};
	}]);
	window.appSettings.module.directive('ngHeight', function () {
		return function ($scope, element, attrs) {
			$scope.resize = function() {
				var toolbarHeight	= parseInt(attrs.ngHeight);
				var winHeight		= $(window).innerHeight();
				
				$('.top-toolbar').css({
					height:	toolbarHeight+'px'
				});
				$(element).css({
					height:	(winHeight-toolbarHeight)+'px'
				});
			}
			$scope.resize();
			$(window).on('resize', function() {
				$scope.resize();
			});
		};
	});
	window.appSettings.module.directive('rotation', function () {
		return {
			link: 			function ($scope, element, attrs) {
				$scope.$watch('rotation', function() {
					if ($scope.rotation) {
						$(element).css({
							'transform':			'rotate('+$scope.rotation+'deg)',
							'-webkit-transform':	'rotate('+$scope.rotation+'deg)',
							'-moz-transform':		'rotate('+$scope.rotation+'deg)',
							'-ms-transform':		'rotate('+$scope.rotation+'deg)',
							'-o-transform':			'rotate('+$scope.rotation+'deg)'
						});
					}
				});
			},
			scope:			{
				rotation:	'='
			}
		};
	});
	window.appSettings.module.directive('bgProgress', ['$timeout',function($timeout) {
		return {
			link:	function ($scope, element, attrs) {
				$timeout(function() {
					//ftl.log("attrs.bgProgress",attrs.bgProgress);
					$(element).css({
						'background-image':		'url(/theme/images/bg/blue.png)',
						'background-position':	'center left',
						'background-size':		attrs.bgProgress+' 100%',
						'background-repeat':	'no-repeat'
					});
				});
			}
		};
	}]);
	window.appSettings.module.directive('bgImage', function () {
		return {
			link: 			function ($scope, element, attrs) {
				var resetCss	= function() {
					var css = {
						'background-image':		"url('"+$scope.bgImage+"')",
						'background-position':	'center center',
						'background-size':		'cover',
						'background-repeat':	'no-repeat'
					};
					if ($scope.$eval(attrs.css)) {
						css	= _.extend(css, $scope.$parent.$eval(attrs.css));
					}
					$(element).css(css);
				}
				
				
				$scope.$watch('bgImage', function() {
					if ($scope.bgImage) {
						resetCss();
					}
				});
			},
			scope:			{
				bgImage:	'='
			}
		};
	});
	window.appSettings.module.directive('longText', function () {
		return {
			link:	function ($scope, element, attrs) {
				if ($(element).height() > 100) {
					
					$(element).addClass('closed');
					
					$(element).on('click', function() {
						$(element).removeClass('closed');
					});
				}
			},
			restrict:	'C'
		};
	});
	window.appSettings.module.directive('ngHighlight', function () {
		return {
			link:	function ($scope, element, attrs) {
				var update = function() {
					var content = $scope.text;
					if (!content) {
						return false;
					}
					//ftl.log("content",content);
					content	= content.replace(new RegExp($scope.ngHighlight, 'gmi'), function(match) {
						return '<span class="ng-highlight">'+match+'</span>'
					});
					$(element).html(content);
					//ftl.log(">>",content, $scope.text, $scope);
				}
				$scope.$watch('ngHighlight', function() {
					update();
				});
				$scope.$watch('text', function() {
					update();
				});
			},
			scope:			{
				text:			'=',
				ngHighlight:	'='
			}
		};
	});
})(window);