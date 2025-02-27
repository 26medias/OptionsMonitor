(function(window) {
	
    class ObjectFilter {
        /**
         * Creates a parametric filter function.
         * @param {Function} filterFactory - A function that returns a filter object.
         * @returns {Function} - A function that takes (data, params) and returns filtered data.
         */
        create(filterFactory) {
            return (data, params) => {
                // Generate filter criteria by spreading the filter parameters.
                const criteria = filterFactory(...params);
                // Filter the data based on the criteria.
                return data.filter(item => this.matches(item, criteria));
            };
        }
    
        /**
         * Checks if an object matches all filter criteria.
         * @param {Object} item - The data object.
         * @param {Object} criteria - The filter criteria.
         * @returns {Boolean} - True if item matches all criteria.
         */
        matches(item, criteria) {
            for (const field in criteria) {
                if (Object.prototype.hasOwnProperty.call(criteria, field)) {
                    const fieldConditions = criteria[field];
                    const fieldValue = this.getValueByPath(item, field);
                    if (!this.evaluateField(fieldValue, fieldConditions)) {
                        return false;
                    }
                }
            }
            return true;
        }
    
        /**
         * Evaluates a single field against its conditions.
         * @param {*} value - The value from the object.
         * @param {Object} conditions - An object where keys are operators.
         * @returns {Boolean} - True if all conditions are satisfied.
         */
        evaluateField(value, conditions) {
            for (const operator in conditions) {
                if (Object.prototype.hasOwnProperty.call(conditions, operator)) {
                    const conditionValue = conditions[operator];
                    if (!this.applyOperator(value, operator, conditionValue)) {
                        return false;
                    }
                }
            }
            return true;
        }
    
        /**
         * Applies an operator to compare the field value with a condition value.
         * @param {*} fieldValue - The value from the object.
         * @param {String} operator - The operator (e.g. '<=', '>', etc.).
         * @param {*} conditionValue - The threshold value.
         * @returns {Boolean} - The result of the operator comparison.
         */
        applyOperator(fieldValue, operator, conditionValue) {
            switch (operator) {
                case '<':
                    return fieldValue < conditionValue;
                case '<=':
                    return fieldValue <= conditionValue;
                case '>':
                    return fieldValue > conditionValue;
                case '>=':
                    return fieldValue >= conditionValue;
                case '==':
                    return fieldValue == conditionValue;
                case '===':
                    return fieldValue === conditionValue;
                case '!=':
                    return fieldValue != conditionValue;
                case '!==':
                    return fieldValue !== conditionValue;
                default:
                    throw new Error(`Unsupported operator: ${operator}`);
            }
        }
    
        /**
         * Retrieves the value from an object using dot notation.
         * @param {Object} object - The source object.
         * @param {String} path - Dot notation path (e.g. 'day.marketcycle').
         * @returns {*} - The value at the specified path, or undefined if not found.
         */
        getValueByPath(object, path) {
            const keys = path.split('.');
            let current = object;
            for (const key of keys) {
                if (current === undefined || current === null) {
                    return undefined;
                }
                current = current[key];
            }
            return current;
        }
    }

	window.appSettings.module.directive('uiScans', ['$compile', '$timeout', 'db', function ($compile, $timeout, db) {
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


            // Gradients
            const gradient = new Gradient();
            $scope.oscColorAt = gradient.factory({
                colors: ['#4aa49a', '#4aa49a', '#aaaaaa', '#e26053', '#e26053'],
                min: 10,
                max: 90
            });
            $scope.smallGainColorAt = gradient.factory({
                colors: ['#e26053', '#aaaaaa', '#4aa49a'],
                min: -3,
                max: 3
            });
            $scope.gainColorAt = gradient.factory({
                colors: ['#e26053', '#e26053', '#aaaaaa', '#4aa49a', '#4aa49a'],
                min: -10,
                max: 10
            });
            $scope.optionCostColorAt = gradient.factory({
                colors: ['#4aa49a', '#4aa49a', '#aaaaaa', '#e26053', '#e26053'],
                min: 200,
                max: 800
            });
            $scope.rankColorAt = gradient.factory({
                colors: ['#4aa49a', '#4aa49a', '#aaaaaa', '#e26053', '#e26053'],
                min: 1,
                max: 1000
            });
            $scope.rankChangeColorAt = gradient.factory({
                colors: ['#4aa49a', '#aaaaaa', '#e26053'],
                min: -200,
                max: 200
            });
            $scope.mentionChangeColorAt = gradient.factory({
                colors: ['#e26053', '#aaaaaa', '#4aa49a'],
                min: -200,
                max: 200
            });
            $scope.mentionsColorAt = gradient.factory({
                colors: ['#e26053', '#aaaaaa', '#4aa49a'],
                min: 0,
                max: 50
            });
            $scope.newsCountColorAt = gradient.factory({
                colors: ['#e26053', '#aaaaaa', '#4aa49a'],
                min: 0,
                max: 20
            });
            $scope.pricePenaltyColorAt = gradient.factory({
                colors: ['#4aa49a', '#aaaaaa', '#e26053'],
                min: 0,
                max: 20
            });



            // Filters
            const filters = new ObjectFilter();

            // General filter, all below values
            const filter_general = filters.create(function(day, week, month) {
                return {
                    "day.marketcycle": { "<=": day },
                    "week.marketcycle": { "<=": week },
                    "month.marketcycle": { "<=": month }
                };
            })
            // Perfect triple up - Perfect signal but very rare, almost useless
            const filter_up_all = filters.create(function(day, week, month) {
                return {
                    "day.marketcycle": { "<=": day },
                    "day_diff.marketcycle": { ">": 0 },
                    "week.marketcycle": { "<=": week },
                    "week_diff.marketcycle": { ">": 0 },
                    "month_prev.marketcycle": { "<=": month },
                    "month_diff.marketcycle": { ">": 0 }
                };
            })
            // Month up
            const filter_up_month = filters.create(function(day, week, month) {
                return {
                    "day.marketcycle": { "<=": day },
                    "week.marketcycle": { "<=": week },
                    "month_prev.marketcycle": { "<=": month },
                    "month_diff.marketcycle": { ">": 0 }
                };
            })
            // Day up
            const filter_up_day = filters.create(function(day, week, month) {
                return {
                    "day.marketcycle": { "<=": day },
                    "day_diff.marketcycle": { ">": 0 },
                    "week.marketcycle": { "<=": week },
                    "month.marketcycle": { "<=": month }
                };
            })


			
			$scope.main = {
				loading:	false,

                refreshSettings: db.getState('refresh_settings') || {
                    refreshMinute: true,
                    refreshHour: true,
                    refreshDay: true,
                    refreshWeek: true,
                    refreshMonth: true,
                    refreshOptions: true,
                    refreshReddit: true,
                    refreshNews: true
                },

                toggleRefreshSettings: function(name) {
                    $scope.safeApply(function() {
                        $scope.main.refreshSettings[name] = !$scope.main.refreshSettings[name];
                    });
                    db.setState('refresh_settings', $scope.main.refreshSettings);
                },

                backgroundTheme: db.getState('scan_theme') || "MarketCycleLong",
                themeToggles: [{
                    label: 'MarketCycle (Long)',
                    value: 'MarketCycleLong'
                }, {
                    label: 'MarketCycle (Short)',
                    value: 'MarketCycleShort'
                }, {
                    label: 'Option Cost',
                    value: 'option-cost'
                }, {
                    label: 'Reddit Rank',
                    value: 'reddit-rank'
                }, {
                    label: 'Reddit Mentions',
                    value: 'reddit-mentions'
                }, {
                    label: 'Reddit Rank Change',
                    value: 'reddit-rank-change'
                }, {
                    label: 'Reddit Mentions Change',
                    value: 'reddit-mentions-change'
                }, {
                    label: 'News Count',
                    value: 'news-count'
                }, {
                    label: 'Minute change',
                    value: 'minute-change'
                }, {
                    label: 'Hour change',
                    value: 'hour-change'
                }, {
                    label: 'Day change',
                    value: 'day-change'
                }, {
                    label: 'Week change',
                    value: 'week-change'
                }, {
                    label: 'Month change',
                    value: 'month-change'
                }],

                sorting: db.getState('scan_sorting') || 'MarketCycleLong',
                sortingToggles: [{
                    label: 'MarketCycle (Long)',
                    value: 'MarketCycleLong'
                }, {
                    label: 'MarketCycle (Short)',
                    value: 'MarketCycleShort'
                }, {
                    label: 'Option Cost',
                    value: 'option-cost'
                }, {
                    label: 'Reddit Rank',
                    value: 'reddit-rank'
                }, {
                    label: 'Reddit Mentions',
                    value: 'reddit-mentions'
                }, {
                    label: 'Reddit Rank Change',
                    value: 'reddit-rank-change'
                }, {
                    label: 'Reddit Mentions Change',
                    value: 'reddit-mentions-change'
                }, {
                    label: 'News Count',
                    value: 'news-count'
                }, {
                    label: 'Minute change',
                    value: 'minute-change'
                }, {
                    label: 'Hour change',
                    value: 'hour-change'
                }, {
                    label: 'Day change',
                    value: 'day-change'
                }, {
                    label: 'Week change',
                    value: 'week-change'
                }, {
                    label: 'Month change',
                    value: 'month-change'
                }],

				init:	async function() {
                    $scope.main.filter()
				},
				sortData:	async function() {
                    if (!$scope.main.data) return;
                    switch($scope.main.sorting) {
                        case "MarketCycleLong":
                            $scope.main.data.sort((a, b) => {
                                return a.MarketCycleLong > b.MarketCycleLong ? 1 : -1;
                            })
                        break;
                        case "MarketCycleShort":
                            $scope.main.data.sort((a, b) => {
                                return a.MarketCycleShort > b.MarketCycleShort ? 1 : -1;
                            })
                        break;
                        case "option-cost":
                            $scope.main.data.sort((a, b) => {
                                return a.option.pricePerContract > b.option.pricePerContract ? 1 : -1;
                            })
                        break;
                        case "reddit-rank":
                            $scope.main.data.sort((a, b) => {
                                if (!a.reddit) return 1;
                                if (!b.reddit) return -1;
                                return a.reddit?.rank > b.reddit?.rank ? 1 : -1;
                            })
                        break;
                        case "reddit-mentions":
                            $scope.main.data.sort((a, b) => {
                                if (!a.reddit) return 1;
                                if (!b.reddit) return -1;
                                return a.reddit?.mentions > b.reddit?.mentions ? -1 : 1;
                            })
                        break;
                        case "reddit-rank-change":
                            $scope.main.data.sort((a, b) => {
                                if (!a.reddit) return 1;
                                if (!b.reddit) return -1;
                                return a.changes.reddit_rank > b.changes.reddit_rank ? 1 : -1;
                            })
                        break;
                        case "reddit-mentions-change":
                            $scope.main.data.sort((a, b) => {
                                if (!a.reddit) return 1;
                                if (!b.reddit) return -1;
                                return a.changes.reddit_mentions > b.changes.reddit_mentions ? -1 : 1;
                            })
                        break;
                        case "news-count":
                            $scope.main.data.sort((a, b) => {
                                if (!a.news) return 1;
                                if (!b.news) return -1;
                                return a.news?.length > b.news?.length ? -1 : 1;
                            })
                        break;
                        case "minute-change":
                            $scope.main.data.sort((a, b) => {
                                return a.changes.minute > b.changes.minute ? -1 : 1;
                            })
                        break;
                        case "hour-change":
                            $scope.main.data.sort((a, b) => {
                                return a.changes.hour > b.changes.hour ? -1 : 1;
                            })
                        break;
                        case "day-change":
                            $scope.main.data.sort((a, b) => {
                                return a.changes.day > b.changes.day ? -1 : 1;
                            })
                        break;
                        case "week-change":
                            $scope.main.data.sort((a, b) => {
                                return a.changes.week > b.changes.week ? -1 : 1;
                            })
                        break;
                        case "month-change":
                            $scope.main.data.sort((a, b) => {
                                return a.changes.month > b.changes.month ? -1 : 1;
                            })
                        break;
                    }
                    
				},

                calculateBreakEvenPrice: function(strikePrice, costPerContract, optionType='call') {
                    // Validate the option type
                    if (optionType !== 'call' && optionType !== 'put') {
                        throw new Error("Invalid option type. Must be 'call' or 'put'.");
                    }
                
                    // Calculate the premium per share
                    const premiumPerShare = costPerContract / 100;
                
                    // Calculate break-even price based on option type
                    if (optionType === 'call') {
                        return strikePrice + premiumPerShare;
                    } else { // optionType === 'put'
                        return strikePrice - premiumPerShare;
                    }
                },

                getCardColor: function(item) {
                    switch($scope.main.backgroundTheme) {
                        case "minute-change":
                            return $scope.smallGainColorAt(item.changes.minute);
                        case "hour-change":
                            return $scope.smallGainColorAt(item.changes.hour);
                        case "day-change":
                            return $scope.gainColorAt(item.changes.day);
                        case "week-change":
                            return $scope.gainColorAt(item.changes.week);
                        case "month-change":
                            return $scope.gainColorAt(item.changes.month);
                        default:
                        case "MarketCycleLong":
                            return $scope.oscColorAt(item.MarketCycleLong)
                        case "MarketCycleShort":
                            return $scope.oscColorAt(item.MarketCycleShort)
                        case "option-cost":
                            return $scope.optionCostColorAt(item.option.pricePerContract);
                        case "reddit-rank":
                            return $scope.rankColorAt(item.reddit?.rank || 1000);
                        case "reddit-mentions":
                            return $scope.mentionsColorAt(item.reddit?.mentions || 0);
                        case "reddit-rank-change":
                            return $scope.rankChangeColorAt(item.changes.reddit_rank || 0);
                        case "reddit-mentions-change":
                            return $scope.mentionChangeColorAt(item.changes.reddit_mentions || 0);
                        case "news-count":
                            return $scope.newsCountColorAt(item.news?.length || 0);
                    }
                },
                filter: function() {
                    window.ftl.apicall({
                        url:		"http://localhost:3000/scanner/filter",
                        auth:		false,
                        encrypt:	false,
                        headers:	{},
                        params:		{
                            day: 100,
                            week: 100,
                            month: 100,
                            price: 5000
                        },
                        callback:	function(response) {
                            console.log(response)
                            $scope.safeApply(function() {
                                $scope.main.data = response.data.map(item => ({
                                    ...item,
                                    MarketCycleLong: (item.day.marketcycle+item.week.marketcycle+item.month.marketcycle)/3,
                                    MarketCycleShort: (item.day.marketcycle+item.week.marketcycle+(100-item.month.marketcycle))/3,
                                    changes: {
                                        minute: (item.minute.close - item.minute_prev.close)/item.minute.close*100,
                                        hour: (item.hour.close - item.hour_prev.close)/item.hour.close*100,
                                        day: (item.day.close - item.day_prev.close)/item.day.close*100,
                                        week: (item.week.close - item.week_prev.close)/item.week.close*100,
                                        month: (item.month.close - item.month_prev.close)/item.month.close*100,
                                        reddit_rank: (item.reddit?.rank - item.reddit?.rank_24h_ago) || 0,
                                        reddit_mentions: (item.reddit?.mentions - item.reddit?.mentions_24h_ago) || 0
                                    }
                                }));
                                $scope.main.sortData();
                                
                                //$scope.main.data = filter_up_day($scope.main.data, [30,50,40])

                                $scope.main.info = response;
                                delete $scope.main.info.data;
                            });
                        },
                        onError:	function(err) {
                            
                        }
                    });
                },
                refresh: function() {
                    $scope.safeApply(function() {
                        $scope.main.refreshLoading = true;
                    });

                    window.ftl.apicall({
                        url:		"http://localhost:3000/scanner/refresh",
                        auth:		false,
                        encrypt:	true,
                        headers:	{},
                        params:		{
                            /*refreshMinute: refresh,
                            refreshHour: refresh,
                            refreshDay: refresh,
                            refreshWeek: refresh,
                            refreshMonth: refresh,
                            refreshOptions: refresh,
                            refreshReddit: refresh,
                            refreshNews: refresh,*/
                            ...$scope.main.refreshSettings,
                            optionsPercentFromStrike: 5,
                            optionsPercentPerDay: 1,
                            optionsminDaysAway: 150,
                        },
                        callback:	function(response) {
                            console.log(response)
                            $scope.safeApply(function() {
                                $scope.main.refreshLoading = false;
                                $scope.main.filter();
                            });
                        },
                        onError:	function(err) {
                            
                        }
                    });
                }
			};
			
			$timeout(function() {
				$scope.main.init();
			});
            
			$scope.$watch('main.sorting', function() {
				$scope.main.sortData();
                db.setState('scan_sorting', $scope.main.sorting);
			});
			$scope.$watch('main.backgroundTheme', function() {
				$scope.main.sortData();
                db.setState('scan_theme', $scope.main.backgroundTheme);
			});
            
			$scope.$on('$destroy', function() {
				clearInterval(refreshClock);
			});
		}
		return {
			link: 			component,
			scope:			{

			},
			templateUrl:	window.appSettings.path.components+'/scans/scans.html'
		};
	}]);
})(window);