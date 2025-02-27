+(function(window) {
	
	window.appSettings.module.directive('uiEditor', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
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
			
			/*var aceLoaded	= function(_editor) {
				_editor.commands.addCommand({
					name: "save",
					bindKey: {win: "Ctrl-S", mac: "Command-S"},
					exec: function(editor) {
						console.log("ACE SAVE");
						//window.ftl.editor.current.save();
					}
				});
				_editor.commands.addCommand({
					name: "saveAs",
					bindKey: {win: "Ctrl-Shift-S", mac: "Command-Shift-S"},
					exec: function(editor) {
						console.log("ACE SAVE AS");
						//window.ftl.editor.current.saveAs();
					}
				});
			}*/
			
			$scope.main	= {
				loading:	false,
				data:		"",
				settings:	{
					mode:			'solidity',
					theme:			'twilight',
					useWrapMode:	true,
					showGutter:		false,
					highlighting:	true,
					//onLoad: 		aceLoaded
				},
				init:		function() {
					
				},
				refresh:		function() {
					
				}
			};
			
			var debounceITV;

			$scope.$on('$destroy', function() {
				/*_.each(tokens, function(v,k) {
					window.Arbiter.unsubscribe(v);
				})*/
			});
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				code: '='
			},
			templateUrl:	window.appSettings.path.components+'/ui/editor.html'
		};
	}]);


	window.appSettings.module.directive('uiLoading', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
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

			$scope.main	= {
				init:		function() {
					
				},
				refresh:		function() {
					
				}
			};

			$scope.$on('$destroy', function() {});
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				min: '=',
				max: '='
			},
			templateUrl:	window.appSettings.path.components+'/ui/loading.html'
		};
	}]);

	window.appSettings.module.directive('uiToggles', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
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

			$scope.tabs	= {
				token: {},
				selected:	$scope.active,
				select:		function(id) {
					$scope.safeApply(function() {
						if ($scope.tabs.selected!=id) {
						}
						$scope.tabs.selected	= id;
						$scope.active = id;
					});
				},
				is:		function(id) {
					return $scope.tabs.selected	== id;
				}
			};

			$scope.main	= {
				init:		function() {
					
				},
				refresh:		function() {
					
				}
			};

			$scope.$watch('active', function() {
				console.log($scope.active)
				$scope.tabs.select($scope.active);
			});
			$scope.$on('$destroy', function() {});
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				options: '=',
				active: '='
			},
			templateUrl:	window.appSettings.path.components+'/ui/toggles.html'
		};
	}]);


	window.appSettings.module.directive('sparkline', ['$compile', '$timeout', 'priceData', 'roundService', 'core', function ($compile, $timeout, priceData, roundService, core) {
		var component = function($scope, element, attrs) {
			
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

			var timer;
			var chart;
			$scope.main	= {
				started: 	false,
				labels:		{
					'price': 	'#607D8B',
					'before': 	'#78909C',
					'betting': 	'#0288D1',
					'active': 	'#388E3C',
					'after': 	'#78909C'
				},
				styles: {
					'default': 	'{fill-color: #ffffff;}',
					'up': 		'{fill-color: #43A047;}',
					'down': 	'{fill-color: #EF5350;}'
				},
				id: 		window.ftl.sid(),
				init:		function() {
					var parts = $scope.bet.pair.split('/');
					$scope.main.symbol = parts[0];
					//console.log("init()");
					if (!$scope.main.started) {
						$scope.main.started = true;
						$scope.main.refresh();
					}
				},
				refresh: async function() {
					//console.log("--------------------");
					//console.log($scope.bet.pair);
					if (roundService.state.isBetting($scope.bet)) {	// roundService.state.isUpcoming($scope.bet) || 
						//console.log(">> isBetting");
						// Betting pahse, show the past price
						$scope.main.data = await priceData.latest($scope.main.symbol, 30);
						//console.log("$scope.main.data", $scope.main.data);
					} else if (roundService.state.isActive($scope.bet)) {
						// Live price
						//console.log(">> isActive");
						$scope.main.data = await priceData.range($scope.main.symbol, $scope.bet.start_time_date.iso, new Date());
					} else if (roundService.state.isPending($scope.bet)) {
						//console.log(">> isPending");
						// Range price
						$scope.main.data = await priceData.range($scope.main.symbol, $scope.bet.start_time_date.iso, $scope.bet.end_time.iso);
					} else if (roundService.state.isOver($scope.bet)) {
						//console.log(">> isOver");
						// Range price
						$scope.main.data = await priceData.range($scope.main.symbol, $scope.bet.start_time_date.iso, $scope.bet.end_time.iso, true);
					} else {
						//console.log(">> Else");
						$scope.main.data = await priceData.latest($scope.main.symbol, 30);
					}

					$scope.main.annotation = {};

					// Timer handling
					if (!timer && !roundService.state.isOver($scope.bet) && !roundService.state.isPending($scope.bet)) {
						//console.log("Timer creation", $scope.main.symbol);
						timer = core.timer(10000, function() {
							//console.log("Timer exec", $scope.main.symbol);
							$scope.main.refresh();
						});
					} else if(timer && roundService.state.isOver($scope.bet)) {
						timer.remove();
					}

					var _start	= new Date($scope.bet.start_time_date.iso).getTime();
					var _bet 	= new Date($scope.bet.bet_end.iso).getTime();
					var _end	= new Date($scope.bet.end_time.iso).getTime();
					var _now 	= new Date().getTime();
					var between = function(a, b, c) {
						return b <= a && c >= a;
					};
					var d = function(a) {
						return new Date(a).getTime();
					};

					var _set = function(data, label, n) {
						var item = data[n];
						item[label] = true;
						return item;
					}
					// Set the bool states on the data
					$scope.main.data = _.map($scope.main.data, function(item, n) {
						if (between(d(item.createdAt), _start, _bet)) {
							item = _set($scope.main.data, 'betting', n);
						}
						if (between(d(item.createdAt), _bet, _end)) {
							item = _set($scope.main.data, 'active', n);
						}
						/*if (between(d(item.createdAt), _start, _end)) {
							item = _set($scope.main.data, 'round', n);
						}*/
						if (d(item.createdAt) >= _end) {
							item = _set($scope.main.data, 'after', n);
						}
						if (d(item.createdAt) <= _start) {
							item = _set($scope.main.data, 'before', n);
						}
						return item;
					});
					// Connect the gaps, set the annotations
					var i;
					var l = $scope.main.data.length;
					for (i=l-1;i>0;i--) {
						_.each($scope.main.labels, function(color, label) {
							if (!$scope.main.data[i][label] && $scope.main.data[i-1][label]) {
								$scope.main.data[i][label] = true;
							}
						});
						_.each($scope.main.labels, function(color, label) {
							/*if ($scope.main.data[i].betting && !$scope.main.data[i-1].betting) {
								$scope.main.annotation[$scope.main.data[i].createdAt] = {
									label: 'Betting',
									style: $scope.main.styles['default']
								};
							}*/
							if ($scope.main.data[i].active && !$scope.main.data[i-1].active) {
								
								if ($scope.bet.locked_price) {
									$scope.main.annotation[$scope.main.data[i].createdAt] = {
										label: '$'+($scope.bet.locked_price.price/(10**8)).toFixed(4),
										style: $scope.main.styles['default']
									};
								} else {
									$scope.main.annotation[$scope.main.data[i].createdAt] = {
										label: 'loading...',
										style: $scope.main.styles['default']
									};
								}
							}
							/*if ($scope.main.data[i].after && !$scope.main.data[i-1].after) {
								$scope.main.annotation[$scope.main.data[i].createdAt] = 'Round End';
							}*/
						});
					}
					if ($scope.main.data.length==0) {
						return false;
					}
					// Extra annotations
					$scope.main.labels['active'] = '#388E3C';
					if (roundService.state.isPending($scope.bet)) {
						$scope.main.annotation[$scope.main.data[$scope.main.data.length-1].createdAt] = {
							label: 'loading...',
							style: $scope.main.styles['default']
						};
					} else if (roundService.state.isOver($scope.bet)) {
						// Over
						var style = $scope.main.styles['default'];
						if ($scope.bet.locked_end_price.price > $scope.bet.locked_price.price) {
							style = $scope.main.styles['up'];
						} else if ($scope.bet.locked_end_price.price < $scope.bet.locked_price.price) {
							style = $scope.main.styles['down'];
						}
						$scope.main.annotation[$scope.main.data[$scope.main.data.length-1].createdAt] = {
							label: '$'+(parseInt($scope.bet.locked_end_price.price)/(10**8)).toFixed(4),
							style: style//$scope.main.styles['default']
						};
					} else if (roundService.state.isActive($scope.bet) && $scope.bet.locked_price) {
						// Over
						var lastPrice = $scope.main.data[$scope.main.data.length-1];
						var style = $scope.main.styles['default'];
						if (lastPrice.value*10**8 > $scope.bet.locked_price.price) {
							style = $scope.main.styles['up'];
						} else if (lastPrice.value*10**8 < $scope.bet.locked_price.price) {
							style = $scope.main.styles['down'];
						}
						$scope.main.annotation[$scope.main.data[$scope.main.data.length-1].createdAt] = {
							label: '$'+(lastPrice.value.toFixed(4)),
							style: style//$scope.main.styles['default']
						};
					} else {
						$scope.main.annotation[$scope.main.data[$scope.main.data.length-1].createdAt] = {
							label: '$'+($scope.main.data[$scope.main.data.length-1].value).toFixed(4),
							style: $scope.main.styles['default']
						};
					}

					var endPrice;
					if (roundService.state.isActive($scope.bet) || roundService.state.isPending($scope.bet)) {
						endPrice = $scope.main.data[$scope.main.data.length-1].value*10**8;
					} else if (roundService.state.isOver($scope.bet)) {
						endPrice = parseInt($scope.bet.locked_end_price.price);
					}

					if ($scope.bet.locked_price && endPrice && endPrice > parseInt($scope.bet.locked_price.price)) {
						$scope.main.labels['active'] = '#43A047';
					} else if ($scope.bet.locked_price && endPrice && endPrice < parseInt($scope.bet.locked_price.price)) {
						$scope.main.labels['active'] = '#EF5350';
					}

					//console.log("$scope.bet.locked_price", $scope.bet.pair, $scope.bet.locked_price);
					//console.log("endPrice", $scope.bet.pair, endPrice);
					//console.log("label", $scope.bet.pair, $scope.main.labels);
					//console.log($scope.bet.pair, $scope.main.data);


					//console.log("annotations", $scope.main.annotation);

					//if ($scope.main.data.length != $scope.main.prevDataLength) {
						$scope.main.prevDataLength = $scope.main.data.length;
						$scope.main.display();
					//}
					return true;
				},
				display: function() {
					var container = element.find('div').get(0);

					var values  = _.map($scope.main.data, function(item, n) {
						return item.value;
					});
					var data  = _.map($scope.main.data, function(item, n) {
						try {
							return [
								new Date(item.createdAt), 
								item.value,
								$scope.main.annotation[item.createdAt]?$scope.main.annotation[item.createdAt].label:null,
								$scope.main.annotation[item.createdAt]?'point '+$scope.main.annotation[item.createdAt].style:'point {}',
								'$'+item.value.toFixed(5)+'', 

								item.before?item.value:null, 
								'$'+item.value.toFixed(5)+'',

								item.betting?item.value:null,
								'Betting: $'+item.value.toFixed(5)+'',

								item.active?item.value:null,
								'Active: $'+item.value.toFixed(5)+'',

								item.after?item.value:null,
								'$'+item.value.toFixed(5)+'',
							];
						} catch (e) {
							console.log("ERROR", item, n, e.message);
						}
					});
					//console.log("sparkline data", $scope.bet.pair, data);
					//console.log("sparkline raw data", $scope.bet.pair, values);

					var table = new google.visualization.DataTable();
					table.addColumn('date', 'Date');
					table.addColumn('number', $scope.main.symbol+'-USD');
					table.addColumn({type: 'string', role: 'annotation'});
					table.addColumn({type: 'string', role: 'style'});
					table.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
					table.addColumn('number', $scope.main.symbol+'-USD');
					table.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
					table.addColumn('number', $scope.main.symbol+'-USD');
					table.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
					table.addColumn('number', $scope.main.symbol+'-USD');
					table.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
					table.addColumn('number', $scope.main.symbol+'-USD');
					table.addColumn({type: 'string', role: 'tooltip', 'p': {'html': true}});
					table.addRows(data);
					/*if (!chart) {
						chart = new google.visualization.LineChart(container);
						table.addRows([]);
						chart.draw(table, options);
						//table.addRows(data);
						//$scope.main.display();
					} else {
						table.addRows(data);
					}*/

					var options = {
						hAxis: {
							title: 'Time',
							gridlines: {
								color: 'transparent'
							}
						},
						vAxis: {
							title: $scope.main.symbol+'-USD',
							gridlines: {
								color: 'transparent'
							},
							viewWindow: {
								min: Math.min.apply(Math, values),
								max: Math.max.apply(Math, values),
							}
						},
						tooltip: {isHtml: true},
						legend: 'none',
						backgroundColor: 'transparent',
						colors: _.map($scope.main.labels, function(v,k) {return v;}),
						width: 150,
						height: 50,
						chartArea:{left:0,top:20,width:'90%',height:'100%'},
						annotations: {
							textStyle: {
								fontSize: 8,
								color: '#ffffff',
								opacity: 1
							}
						}
					};
					//console.log("options", $scope.main.symbol, options);


					//console.log("Container", 'chart-'+$scope.main.id, container);

					if (!chart) {
						chart = new google.visualization.LineChart(container);
						chart.draw(table, options);
					} else {
						chart.draw(table, options);
					}
				}
			};


			
			$scope.$watch('bet', function() {
				if ($scope.bet) {
					$scope.main.init();
				}
			}, true);

			$scope.$on('$destroy', function() {
				//clearInterval(refreshClock);
				if (timer) {
					timer.remove();
				}
			});
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				bet: '='
			},
			templateUrl:	window.appSettings.path.components+'/ui/sparkline.html'
		};
	}]);
	
	window.appSettings.module.directive('uiDataShare', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
			console.log("dataShare");
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

			$scope.main = {
				id:		ftl.sid(),
				url: 	'',
				init:	function() {
					$scope.main.title = attrs.label;
					$scope.main.url = attrs.link;
					$timeout(function() {
						new ClipboardJS('#cp-'+$scope.main.id, {
							text: function(trigger) {
								return attrs.link;
							}
						});
					});
				},
				copy:	function() {
					$scope.main.copied = true;
				},
				explore: function() {
					
				}
			};

			$scope.main.init();
		}
		return {
			link: 			component,
			replace:		false,
			scope:			{
				
			},
			templateUrl:	window.appSettings.path.components+'/ui/data-share.html'
		};
	}]);
	
	window.appSettings.module.directive('datePicker', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
			console.log("datePicker!");
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
			
			$scope.main = {
				opened: false,
				init: function() {
					console.log("datePicker.init()", $(element));

					$(element).get(0).addEventListener('click', function(e) {
						console.log("datePicker.click()", simplepicker);
						if ($scope.datePicker) {
							simplepicker.reset(new Date($scope.datePicker));
						}
						simplepicker.open();
						$scope.main.opened = true;
					});

					// $eventLog.innerHTML += '\n\n';
					simplepicker.on('submit', function(date, readableDate) {
						if (!$scope.main.opened) {
							return false;
						}
						$scope.main.opened = false;
						console.log("submit", date, readableDate);
						$scope.datePicker = date;
						//$eventLog.innerHTML += readableDate + '\n';
					});

					simplepicker.on('close', function(date) {
						console.log("close", date);
						$scope.main.opened = false;
						//$eventLog.innerHTML += 'Picker Closed'  + '\n';
					});
				}
			};

			$scope.main.init();
		}
		return {
			link: 			component,
			replace:		false,
			scope:			{
				datePicker:	'='
			}
		};
	}]);


	
	window.appSettings.module.directive('uiDropdown', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
			
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
			
			$scope.main = {
				opened:	false,
				init: function() {
					$scope.label	= attrs.label;
					$scope.icon		= attrs.icon;
					if (attrs.onGeneratorSelect) {
						$scope.main.onGeneratorSelect = $scope.$parent.$eval(attrs.onGeneratorSelect);
					}
				},
				onChange: function() {
					if (($scope.value || $scope.value==0 || $scope.value===false) && $scope.values && $scope.values.length > 0) {
						if (!$scope.value && $scope.value!=0 && $scope.value!==false) {
							$scope.main.select($scope.values[0], false);
						} else {
							$scope.main.select(_.find($scope.values, function(item) {return item.value == $scope.value}), false);
						}
					}
				},
				open: function() {
					$scope.safeApply(function() {
						$scope.main.opened = !$scope.main.opened;
					});
				},
				close: function() {
					$scope.safeApply(function() {
						$scope.main.opened = false;
					});
				},
				select: function(item, execCallback) {
					if (!item) {
						return false;
					}
					$scope.safeApply(function() {
						$scope.main.selected	= item;
						
						$scope.value			= item.value;
						if (execCallback) {
							if ($scope.onSelect) {
								//ftl.log("onSelect", item.value);
								$scope.onSelect(item.value);
							}
							if ($scope.main.onGeneratorSelect) {
								//ftl.log("onSelect", item.value);
								$scope.main.onGeneratorSelect(item.value);
							}
						}
					});
				}
			};
			
			$timeout(function() {
				$scope.main.init();
			});
			$scope.$watch('values', function() {
				if ($scope.values) {
					//ftl.log("$scope.values", $scope.values);
					$scope.main.onChange();
				}
			}, true);
			$scope.$watch('value', function() {
				if ($scope.values) {
					//ftl.log("$scope.value", $scope.value);
					$scope.main.onChange();
				}
			}, true);
			
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				values:				'=', // Data source: object
				value:				'=',
				onSelect:			'='
			},
			templateUrl:	window.appSettings.path.components+'/ui/dropdown.html'
		};
	}]);
	window.appSettings.module.directive('progressBar', function() {
		var component = function($scope, element, attrs) {
			
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
			
			var gradient	= new ColorGradient(['#f7796f', '#fbc800', '#1ffab7']);
			$scope.color	= "#FFB300";
			
			$scope.$watch('progressBar', function() {
				$scope.safeApply(function() {
					if ($scope.progressBar) {
						$scope.color = gradient.getHexColorAtPercent($scope.progressBar);
					}
				});
			});
			
		}
		return {
			link: 			component,
			replace:		true,
			restrict:		'A',
			scope:			{
				progressBar:	'=',
			},
			templateUrl:	window.appSettings.path.components+'/ui/progress-bar.html'
		};
	});
	window.appSettings.module.directive('uiTreeview', ['$compile', '$timeout', function ($compile, $timeout) {
		var component = function($scope, element, attrs) {
			
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
			
			// Auth
			$scope.auth		= window.ftl.safe('auth');
			window.Arbiter.subscribe('auth.authenticated', function() {
				$scope.safeApply(function() {
					$scope.auth = window.ftl.safe('auth');
				});
			});

			
			$scope.treeview = {
				tabSize:	20,
				open:		{},
				toggle:	function(jpath) {
					$scope.treeview.open[jpath] = !$scope.treeview.open[jpath];
					$scope.treeview.refreshVisibility();
				},
				openAll:	function() {
					$scope.treeview.open	= {};
					_.each($scope.treeview.flat, function(item, n) {
						if (item.type=='path') {
							$scope.treeview.open[item.dotnotation] = true;
						}
					});
					$scope.treeview.refreshVisibility();
				},
				closeAll:	function() {
					$scope.treeview.open	= {};
					$scope.treeview.refreshVisibility();
				},
				refreshVisibility:	function() {
					//console.clear();
					
					$scope.treeview.flat = _.map($scope.treeview.flat, function(item, n) {
						item.visible = true;
						// Make sure all the ancestors are also visible
						_.each(item.treepath.split('.'), function(p, n) {
							var ap = item.treepath.split('.').slice(0, n+1).join('.');
							item.visible = item.visible && $scope.treeview.open[ap];
						});
						
						if (item.level==1) {
							item.visible	= true;
						}
						
						return item;
					});
					
					return false;
				},
				// Get the values as flat 1D dot notations
				dotNotationValues: 	function(tree) {
					var res = {};
					(function recurse(obj, current) {
						for(var key in obj) {
							var value = obj[key];
							var newKey = (current ? current + "." + key : key);  // joined key with dot
							if(value && typeof value === "object") {
								recurse(value, newKey);  // it's a nested object, so do it again
							} else {
								res[newKey] = value;  // it's not an object, so set the property
							}
						}
					})(tree);
					var flat = _.map(res, function(v, k) {
						return {
							level:			k.split('.').length,
							dotnotation:	k,
							treepath:		k.split('.').slice(0, k.split('.').length-1).join('.'),
							name:			k.split('.').slice(-1)[0],
							value:			v
						}
					});
					flat.sort(function(a, b) {
						if (a.treepath == b.treepath) {
							return a.name < b.name ? -1 : 1;
						}
						return a.treepath < b.treepath;
					});
					return flat;
				},
				// Get the file tree, flattened
				flatten: 	function(tree) {
					var values	= {};
					var paths	= {};
					(function recurse(obj, current) {
						for(var key in obj) {
							var value = obj[key];
							var newKey = (current ? current + "." + key : key);  // joined key with dot
							if(value && typeof value === "object") {
								paths[newKey] = true;
								recurse(value, newKey);  // it's a nested object, so do it again
							} else {
								values[newKey]	= value;  // it's not an object, so set the property
							}
						}
					})(tree);
					
					// Add the values
					var flat = _.map(values, function(v, k) {
						return {
							level:			k.split('.').length,
							type:			"value",
							dotnotation:	k,
							treepath:		k.split('.').slice(0, k.split('.').length-1).join('.'),
							name:			k.split('.').slice(-1)[0],
							value:			v
						}
					});
					// Add the paths
					_.each(paths, function(v, k) {
						flat.push({
							level:			k.split('.').length,
							type:			"path",
							dotnotation:	k,
							treepath:		k.split('.').slice(0, k.split('.').length-1).join('.'),
							name:			k.split('.').slice(-1)[0]
						});
					});
					// Sort
					flat.sort(function(a, b) {
						/*var Adn = a.dotnotation.split('.');
						var Bdn = b.dotnotation.split('.');
						var Al = Adn.length;
						var Bl = Bdn.length;
						var i;
						for (i=0;i<Math.min(Al, Bl); i++) {
							// Dotnotation at that level matches
							if (Adn[i]==Bdn[i]) {
								// Continue
							} else {
								// Dot notation differs
								return Adn.slice(0,i).join('.')+'.' < Bdn.slice(0,i).join('.')+'.' ? -1 : 1;
							}
						}
						
						*/
						/*if (b.treepath==a.dotnotation) {
							return a.name < b.name ? -1 : 1;
						} else {
							return a.dotnotation < b.dotnotation ? -1 : 1;
						}
						return 0;*/
						/*
						if (a.type=="value" && b.type=="path" && b.treepath==a.dotnotation) {
							return -1
						}
						if (b.type=="value" && a.type=="path" && a.treepath==b.dotnotation) {
							return 1
						}
						var Adn = a.dotnotation.split('.');
						var Bdn = b.dotnotation.split('.');
						var Al = Adn.length;
						var Bl = Bdn.length;
						var i;
						for (i=0;i<Math.min(Al, Bl); i++) {
							if (Adn[i]!=Bdn[i]) {
								return Adn.slice(0,i).join('.')+'.' < Bdn.slice(0,i).join('.')+'.' ? -1 : 1;
							}
						}
						*/
						
						if (a.treepath == b.treepath) {
							return a.name < b.name ? -1 : 1;
						}
						return a.dotnotation+'.' < b.dotnotation+'.' ? -1 : 1;
						
					});
					//ftl.log("flat", JSON.parse(JSON.stringify(flat)));
					flat	= _.map(flat, function(item) {
						if (item.type=="path") {
							// Extract the variable names at that level
							item.envKeys	= _.pluck(_.filter(flat, function(l) {
								return l.type=='value' && l.treepath == item.dotnotation;
							}), 'name');
						}
						return item;
					});
					return flat;
				},
				select:	function(line) {
					if (line.type=='value') {
						$scope.onSelect(line.dotnotation);
					} else {
						$scope.onSelect(line.dotnotation+".*");
					}
				}
			};
			
			$timeout(function() {
				$scope.treeview.title	= attrs.name;
			});
			
			$scope.$watch('uiTreeview', function() {
				$scope.safeApply(function() {
					$scope.treeview.flat	= $scope.treeview.flatten($scope.uiTreeview);
					//$scope.treeview.openAll();
					$scope.treeview.refreshVisibility();
				});
			});
			/*
			$scope.$watch('query', function() {
				$scope.safeApply(function() {
					$scope.treeview.flat	= $scope.treeview.flatten($scope.uiTreeview);
					$scope.treeview.flat = _.filter($scope.treeview.flat, function(item) {
						return item.dotnotation.match(new RegExp($scope.query, 'gmi'));
					});
					$scope.treeview.openAll();
					$scope.treeview.refreshVisibility();
				});
			});*/
			
		}
		return {
			link: 			component,
			replace:		true,
			restrict:		'A',
			scope:			{
				uiTreeview:	'=',
				query:		'=',
				onSelect:	'=',
				edit:		'='
			},
			templateUrl:	window.appSettings.path.components+'/ui/treeview.html'
		};
	}]);
	window.appSettings.module.directive('uiToggle', function() {
		var component = function($scope, element, attrs) {
			
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
			
			$scope.$watch('uiToggle', function() {
				
			});
			
		}
		return {
			link: 			component,
			replace:		true,
			restrict:		'A',
			scope:			{
				uiToggle:	'=',
			},
			templateUrl:	window.appSettings.path.components+'ui/toggle.html'
		};
	});
	window.appSettings.module.directive('uiPagination', function() {
		var component = function($scope, element, attrs) {
			
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
			
			$scope.pagination	= {
				display:	9,
				first:	function() {
					if ($scope.uiPagination.page<=0) {
						return false;
					}
					$scope.onPageChange(1);
				},
				last:	function() {
					$scope.onPageChange($scope.uiPagination.pages);
				},
				previous:	function() {
					if ($scope.uiPagination.page>0) {
						$scope.onPageChange(parseInt($scope.uiPagination.page)-1);
					}
				},
				next:	function() {
					if ($scope.uiPagination.page<$scope.uiPagination.pages) {
						$scope.onPageChange(parseInt($scope.uiPagination.page)+1);
					}
				},
				rebuild:	function() {
					if (!$scope.uiPagination || !$scope.uiPagination.pages) {
						$scope.pagination.pageArray = [1];
					}
					
					var i;
					var start;
					var output	= [];
					
					if ($scope.uiPagination.pages > $scope.pagination.display) {
						// More pages to display than the space we have for them.
						// We need to reduce the page number we display
						if (parseInt($scope.uiPagination.page)-Math.floor($scope.pagination.display/2)<1) {
							start	= 1;
						} else {
							start	= parseInt($scope.uiPagination.page)-Math.floor($scope.pagination.display/2);
						}
						
						// Calculate the end
						if (start+$scope.pagination.display > $scope.uiPagination.pages) {
							end		= $scope.uiPagination.pages;
						} else {
							end		= start+$scope.pagination.display-1;
						}
					} else {
						start	= 1;
						end		= $scope.uiPagination.pages;
					}
					
					//ftl.log("range",start, 'to', end);
					
					for (i=start;i<=end;i++) {
						output.push(i);
					}
					$scope.pagination.pageArray =  output;
				}
			}
			
			$scope.$watch('uiPagination', function() {
				console.log("$scope.uiPagination", $scope.uiPagination);
				if ($scope.uiPagination) {
					$scope.uiPagination.pages = Math.floor($scope.uiPagination.total/$scope.uiPagination.page_size);
					$scope.pagination.rebuild();
				}
			}, true);
			
		}
		return {
			link: 			component,
			replace:		true,
			restrict:		'A',
			scope:			{
				uiPagination:	'=',
				onPageChange:	'='
			},
			templateUrl:	window.appSettings.path.components+'/ui/pagination.html'
		};
	});
	window.appSettings.module.directive('editInPlaceTd', ['$timeout', function ($timeout) {
		var component = function($scope, element, attrs) {
			
			
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
			
			$scope.editor = {
				value:	'',
				onBlur:	function() {
					if (attrs.blur) {
						$scope.$eval(attrs.blur);
					}
				},
				edit:	function(val) {
					$scope.safeApply(function() {
						$scope.edit = val;
						if (val) {
							$timeout(function() {
								var input	= $(element).find('input,select');
								input.focus();
							});
						} else {
							// Stop editing
							// Save
							$scope.value = $scope.editor.decode($scope.editor.value);
						}
					});
				},
				encode:	function(input) {
					switch ($scope.editInPlaceTd.type) {
						default:
						case "text":
						case "number":
						case "categories":
						case "subcategories":
							return input;
						break;
						case "difficulty":
							return input.toString();
						break;
						case "countries":
							return input.sort().join(',');
						break;
					}
				},
				decode:	function(input) {
					switch ($scope.editInPlaceTd.type) {
						default:
						case "text":
						case "number":
						case "categories":
						case "subcategories":
							return input;
						break;
						case "difficulty":
							return parseInt(input);
						break;
						case "countries":
							return input.split(',');
						break;
					}
				}
			}
			
			$scope.edit = false;
			
			$scope.$watch('editInPlaceTd', function() {
				if ($scope.editInPlaceTd) {
					
				}
			});
			
			
			
			$scope.$watch('value', function() {
				//ftl.log(">> value", $scope.value, $scope.editor.encode($scope.value), $scope.editor.value);
				if ($scope.value||$scope.value==0) {
					$scope.editor.value = $scope.editor.encode($scope.value);
				}
			});
			
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				editInPlaceTd:	'=',
				value:			'='
			},
			templateUrl:	window.appSettings.path.components+'ui/editInPlace-td.html'
		};
	}]);
	window.appSettings.module.directive('editInPlace', ['$timeout', function ($timeout) {
		var component = function($scope, element, attrs) {
			
			
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
			
			$scope.users	= window.sharedData.users;
			
			$scope.editor = {
				value:	'',
				onBlur:	function() {
					if (attrs.blur) {
						$scope.$eval(attrs.blur);
					}
				},
				selectUser:	function(user) {
					//ftl.log("selectUser", user);
					$scope.editor.value	= user.uuid;
					$scope.value		= user.uuid;
					$scope.editor.edit(false);
				},
				edit:	function(val) {
					if (val !== true && val!==false) {
						val = false;
					}
					$scope.safeApply(function() {
						$scope.edit = val;
						if (val) {
							$timeout(function() {
								var input	= $(element).find('input,select');
								input.focus();
							});
						} else {
							// Stop editing
							// Save
							$scope.value = $scope.editor.decode($scope.editor.value);
						}
					});
				},
				encode:	function(input) {
					switch ($scope.editInPlace.type) {
						default:
						case "text":
						case "categories":
						case "subcategories":
							return input;
						break;
						case "difficulty":
							return input.toString();
						break;
						case "countries":
							return input.sort().join(',');
						break;
						case "date":
							if ($scope.editInPlace.op=="between") {
								if (_.isObject(input) && !_.isDate(input)) {
									// Make sure it's encoded properly
									return {
										from:	new Date(input.from),
										to:		new Date(input.to)
									}
								} else {
									// Convert to an object
									return {
										from:	new Date(input),
										to:		new Date(input)
									}
								}
							} else {
								if (_.isObject(input) && !_.isDate(input)) {
									// Convert to a date
									return new Date(input.from);
								} else {
									// Make sure it's encoded properly
									return new Date(input)
								}
							}
						break;
					}
				},
				decode:	function(input) {
					switch ($scope.editInPlace.type) {
						default:
						case "text":
						case "categories":
						case "subcategories":
							return input;
						break;
						case "difficulty":
							return parseInt(input);
						break;
						case "countries":
							return input.split(',');
						break;
						case "date":
							return input;
						break;
					}
				}
			}
			
			$scope.edit = false;
			
			$scope.$watch('editInPlace', function() {
				if ($scope.editInPlace) {
					// Handle the encoding again, incase the op changed and it affects the encoding method (dates)
					if ($scope.value) {
						$scope.editor.value = $scope.editor.encode($scope.value);
					}
				}
			});
			
			
			$scope.$watch('value', function() {
				if ($scope.value/* && $scope.editor.encode($scope.value) != $scope.editor.value*/) {
					$scope.editor.value = $scope.editor.encode($scope.value);
				}
			}, true);
			
			$scope.$watch('editor.value', function() {
				if ($scope.editor.value/* && $scope.editor.encode($scope.value) != $scope.editor.value*/) {
					$scope.value = $scope.editor.decode($scope.editor.value);
				}
			}, true);
			
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				editInPlace:	'=',
				value:			'='
			},
			templateUrl:	window.appSettings.path.components+'/ui/editInPlace.html'
		};
	}]);
	
	window.appSettings.module.directive('uiTypeAhead', function() {
		var component = function($scope, element, attrs) {
			
			
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
			
			$scope.type	= attrs.type||'uib';
			
			$scope.loading = true;
			
			$scope.placeholder = attrs.placeholder || '(select one)';
			
			
			$scope.ui = {
				loading:	true,
				list:		[],
				buffer:		'',	// user input
				showSuggestions:	false,
				init:		function() {
					$scope.safeApply(function() {
						// Eval the list
						var list			= $scope.uiTypeAhead.slice(0); // copy, not reference
						$scope.ui.list		= list;
						$scope.ui.loading	= false;
						
						//$scope.ui.buffer = $scope.data[attrs.uiTypeAhead];
						
						setTimeout(function() {
							$scope.safeApply(function() {
								$scope.ui.showSuggestions = false;
							});
						}, 500);
					});
				},
				refreshSuggestionList:	function() {
					//ftl.log("$scope.ui.list",$scope.ui.list);
					var parts = _.filter($scope.ui.list, function(item) {
						var matches = item.firstname.match(new RegExp($scope.ui.buffer, 'gmi')) || item.lastname.match(new RegExp($scope.ui.buffer, 'gmi'));
						return matches && matches.length>0;
						//return item.substr(0, $scope.ui.buffer.length) == $scope.ui.buffer.length;
					});
					return parts;
				},
				select:	function(item) {
					$scope.safeApply(function() {
						$scope.value				= item;
						$scope.ui.suggestions		= [];
						$scope.ui.showSuggestions	= false;
						$scope.ui.buffer			= '';
					});
					if ($scope.onSelect) {
						$scope.onSelect(item);
					}
				}
			};
			
			
			$scope.$watch('ui.buffer', function(a, b) {
				if ($scope.ui.buffer && $scope.ui.buffer.length>=1) {
					$scope.safeApply(function() {
						$scope.ui.suggestions		= $scope.ui.refreshSuggestionList();
						//ftl.log("$scope.ui.suggestions",$scope.ui.suggestions);
						$scope.ui.showSuggestions	= true;
					});
				} else {
					$scope.safeApply(function() {
						$scope.ui.suggestions		= [];
						$scope.ui.showSuggestions	= false;
						$scope.ui.buffer			= '';
					});
				}
			});
			
			$scope.$watch('uiTypeAhead', function() {
				if ($scope.uiTypeAhead) {
					$scope.ui.init();
				}
			}, true);
			
			
		}
		return {
			link: 			component,
			replace:		false,
			scope:			{
				uiTypeAhead:	'=',
				value:			'=',
				onSelect:		'='
			},
			templateUrl:	window.appSettings.path.components+'ui/type-ahead.html'
		};
	});
	
	
	window.appSettings.module.directive('uiTags', ['$compile', '$timeout', function ($compile, $timeout) {
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
			$scope.ui = {};
			
			
			// UI
			var sid	= window.ftl.sid();
			var el	= $(element).get(0);
			
			$(el).addClass('tag-'+sid);
			var input	= $(el).find('input');
			input.addClass('input-'+sid);
			$(el).find('.ui-list').addClass('dropdown-'+sid);
			
			$('.input-'+sid).on('focus', function(e) {
				$('.dropdown-'+sid).addClass('active');
			});
			$(el).on('click', function() {
				$('.input-'+sid).focus();
				setTimeout(function() {
					$scope.safeApply(function() {
						$scope.ui._active = true;
					});
				}, 100);
			});
			$(document).on('click', function(e) {
				if (!$.contains($(element).get(0), $(e.target).get(0))) {
					$('.dropdown-'+sid).removeClass('active');
					$scope.safeApply(function() {
						$scope.ui._active = false;
					});
				}
			})
			
			$scope.prop			= attrs.prop || 'label';
			$scope.placeholder	= attrs.placeholder || '';
			
			var fbref;
			
			$scope.ui = {
				tags:	[],
				buffer:	'',
				init:	function() {
					$scope.ui.tags	= $scope.data;
					element.find('input').bind("keydown", function (event) {
						if (event.which === 9) {	// tab
							$scope.ui.onBlur();
						}
					});
				},
				onBlur:	function() {
					if (attrs.blur) {
						$scope.$parent.$eval(attrs.blur);
					}
				},
				create:	function() {
					if ($scope.options && $scope.options.readonly) {
						return false;	// read-only, can't create
					}
					
					$scope.ui.select($scope.ui.buffer.toString());
					$scope.safeApply(function() {
						$scope.ui.buffer	= '';
					});
				},
				select:	function(tag) {
					//ftl.log("select", tag);
					$scope.safeApply(function() {
						var exists	= _.find($scope.uiTags, function(item) {
							return item.value	== tag.value;
						});
						if (exists) {
							return false;
						}
						$scope.uiTags.push(tag);
						$scope.ui.buffer = '';
						$timeout(function() {
							$('.dropdown-'+sid).removeClass('active');
						});
					});
				},
				selected:	function(tag) {
					return !!_.find($scope.uiTags, function(item) {
						return item.value== tag.value;
					});
				},
				remove:	function(tag) {
					//ftl.log("remove", tag);
					$scope.safeApply(function() {
						$scope.uiTags	= _.filter($scope.uiTags, function(item) {
							return item.value	!= tag.value;
						});
					});
				},
				getInputWidth:	function() {
					return Math.min(150, $scope.ui.buffer.length*12+2);
				}
			};
			
			$scope.$watch('data', function() {
				if ($scope.data) {
					$scope.ui.init();
				}
			});
		}
		return {
			link: 			component,
			replace:		false,
			transclude:		false,
			scope:			{
				uiTags:		'=',
				data:		'=',
				options:	'='
			},
			templateUrl:	window.appSettings.path.components+'/ui/tags.html'
		};
	}]);
	window.appSettings.module.directive('uiProgress', function() {
		var component = function($scope, element, attrs) {
			
			
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
			
			$scope.prop = attrs.prop;
			
			//ftl.log("uiModernOptions",$scope);
			
			
			var gradient = new ColorGradient(["#E30D2B", "#F5B638", "#069F4B"]);
			
			
			$scope.ui = {
				getPercent:	function() {
					if (!$scope.uiProgress) {
						return 0;
					}
					return !$scope.value?0:$scope.value/$scope.uiProgress*100;
				},
				getColor:	function(pct) {
					return gradient.getHexColorAtPercent(Math.round(pct));
				}
			};
			
			
			$scope.$watch('uiProgress', function() {
				if ($scope.uiProgress) {
					
				}
			});
			
		}
		return {
			link: 			component,
			replace:		true,
			scope:			{
				uiProgress:	'=',
				value:		'='
			},
			templateUrl:	window.appSettings.path.components+'ui/progress.html'
		};
	});
	
	window.appSettings.module.directive('uiDate', function() {
		var component = function($scope, element, attrs) {
			
			
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
			$scope.getTimeTo = function(date) {
				var ms	= new Date(date).getTime()-new Date().getTime();
				return Math.round(ms/1000)*1000;	// Remove the ms, keep the seconds only to lower the refresh rate
			}
			
			$scope.display = {
				list: 	["timeago", "small","large"],
				index:	0
			}
			
			$scope.toggle	= function() {
				$scope.safeApply(function() {
					$scope.display.index++;
					if ($scope.display.index >= $scope.display.list.length) {
						$scope.display.index = 0;
					}
				});
			}
			
		}
		return {
			link: 			component,
			scope:			{
				uiDate:	'='
			},
			templateUrl:	window.appSettings.path.components+'ui/date.html'
		};
	});
	
	
})(window);