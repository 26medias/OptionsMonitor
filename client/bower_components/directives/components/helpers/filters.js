+(function(window) {
	window.appSettings.module.filter('capitalize', function() {
		return function(input, all) {
			if (!input) {
				return '';
			}
			return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();}) : '';
		}
	});
	window.appSettings.module.filter('shortAddr', function() {
		return function(input, all) {
			if (!input) {
				return '';
			}
			return input.substr(0, 6)+'...'+input.substr(-4);
		}
	});
	window.appSettings.module.filter('shuffle', function() {
		return function(array) {
			//ftl.log("shuffle",array);
			var m = array.length, t, i;
			
			// While there remain elements to shuffle�
			while (m) {
				// Pick a remaining element�
				i = Math.floor(Math.random() * m--);
			
				// And swap it with the current element.
				t = array[m];
				array[m] = array[i];
				array[i] = t;
			}
			
			//ftl.log("end",array);
			
			return array;
		}
	});
	window.appSettings.module.filter('multisort', function() {
		return function(array, keys) {

			keys = keys || {};

			// via
			// https://stackoverflow.com/questions/5223/length-of-javascript-object-ie-associative-array
			var obLen = function(obj) {
				var size = 0, key;
				for (key in obj) {
					if (obj.hasOwnProperty(key))
					size++;
				}
				return size;
			};

			// avoiding using Object.keys because I guess did it have IE8 issues?
			// else var obIx = function(obj, ix){ return Object.keys(obj)[ix]; } or
			// whatever
			var obIx = function(obj, ix) {
				var size = 0, key;
				for (key in obj) {
					// Rewriting with jpath to support dot notation
					/*if (obj.hasOwnProperty(key)) {
						if (size == ix)
						return key;
						size++;
					}*/
					if (ftl.jpath(key, obj)) {
						if (size == ix)
						return key;
						size++;
					}
				}
				return false;
			};

			var keySort = function(a, b, d) {
				d = d !== null ? d : 1;
				// a = a.toLowerCase(); // this breaks numbers
				// b = b.toLowerCase();
				if (a == b)
				return 0;
				return a > b ? 1 * d : -1 * d;
			};

			var KL = obLen(keys);

			if (!KL) {
				return array.sort(keySort);
			}

			for ( var k in keys) {
				// asc unless desc or skip
				keys[k] =
				keys[k] == 'desc' || keys[k] == -1  ? -1
				: (keys[k] == 'skip' || keys[k] === 0 ? 0
				: 1);
			}

			array.sort(function(a, b) {
				var sorted = 0, ix = 0;

				while (sorted === 0 && ix < KL) {
					var k = obIx(keys, ix);
					if (k) {
						var dir = keys[k];
						//sorted = keySort(a[k], b[k], dir);
						sorted = keySort(ftl.jpath(k, a), ftl.jpath(k, b), dir);
						ix++;
					}
				}
				return sorted;
			});
			return array;
		}
	});
	window.appSettings.module.filter('filtered', function() {
		return function(items, property, query, order) {
			if (query && query != '' && query.length>1) {
				var regex = new RegExp(query, 'gmi');
				var filtered = _.filter(items, function(item) {
					if (typeof property == 'string') {
						return item.hasOwnProperty(property) && regex.test(item[property]);
					} else {
						var matched	= false;
						_.each(property, function(prop) {
							//ftl.log("prop", prop, 'item.'+prop, eval('item.'+prop));
							matched	= matched || regex.test(eval('item.'+prop));
						});
						return matched;
					}
				});
				
				if (order) {
					filtered = filtered.sort(function(a, b) {
						return b[order] - a[order];
					});
				}
				
				return filtered;
			}
			return items;
		};
	});
	window.appSettings.module.filter('totime', function() {
		return function(ms, formatString, noTransform) {
			if (!formatString) {
				var formatString	= 'hh mm ss';
			}
			
			ms	= parseInt(ms);
			
			var sign	= 1;
			if (ms<0) {
				sign	= -1;
				ms	= Math.abs(parseInt(ms));
			}
			
			if (!noTransform) {
				/*if (ms < 1000) {
					if (sign>0) {
						return ms+'ms';
					} else {
						return '-'+ms+'ms';
					}
				}*/
			}
			
			var seconds 	= ms / 1000;
			var hours 		= Math.floor(seconds / 3600);
			seconds 		= seconds - hours * 3600;
			var minutes 	= Math.floor(seconds/60);
			var secs 		= seconds % 60;
			secs 			= Math.floor(secs);
			var format = function(n) {
				if (n<=9) {
					return '0'+n;
				}
				return n;
			}
			
			if (!noTransform) {
				if (hours/(24*7)>55) {
					return Math.round(hours/(24*30*55))+' years';
				}
				if (hours/24>30) {
					return Math.round(hours/(24*30))+' months';
				}
				if (hours/24>7) {
					return Math.round(hours/(24*7))+' weeks';
				}
				if (hours>48) {
					return Math.round(hours/24)+' days';
				}
			}
			
			if (hours>0) {
				formatString	= 'hh mm ss';
			} else if (hours==0 && minutes>0) {
				formatString	= 'mm ss';
			} else if (hours==0 && minutes==0 && secs>0) {
				formatString	= 'ss';
			} else {
				formatString	= 'now';
			}
			
			return (sign>0?'':'-')+formatString.replace(/(hh)/, format(hours)+'h').replace(/(mm)/, format(minutes)+'m').replace(/(ss)/, format(secs)+'s');
		};
	});
	window.appSettings.module.filter('totimeago', function() {
		return function(ms, formatString, noTransform) {
			if (!formatString) {
				var formatString	= 'hh:mm:ss';
			}
			var sign	= 1;
			if (ms<0) {
				sign	= -1;
				ms	= Math.abs(ms);
			}
			
			var t	= function(n) {
				if (sign>0) {
					return "in "+n;
				} else {
					return n+" ago";
				}
			}
			var format = function(n) {
				if (n<=9) {
					return '0'+n;
				}
				return n;
			}
			
			if (!noTransform) {
				/*if (ms < 1000) {
					if (sign>0) {
						return t(ms+'ms');
					} else {
						return t(ms+'ms');
					}
				}*/
			}
			/*
			if (ms < 5000) {
				return t((ms/1000).toFixed(2)+' sec');
			}
			*/
			var seconds 	= ms / 1000;
			var hours 		= Math.floor(seconds / 3600);
			seconds 		= seconds - hours * 3600;
			var minutes 	= Math.floor(seconds/60);
			var secs 		= seconds % 60;
			secs 			= Math.round(secs);
			
			if (!noTransform) {
				if (hours/(24*7)>55) {
					return t(Math.ceil(hours/(24*30*55))+' years');
				}
				if (hours/24>30) {
					return t(Math.round(hours/(24*30))+' months');
				}
				if (hours/24>7) {
					return t(Math.round(hours/(24*7))+' weeks');
				}
				if (hours>48) {
					return t(Math.round(hours/24)+' days');
				}
			}
			var output = '';
			if (hours>0) {
				output += format(hours)+'h ';
			}
			if (minutes>0 && hours<=2) {
				output += format(minutes)+'m ';
			}
			if (secs>0 && hours==0) {
				output += format(secs)+'s';
			}
			if (hours==0 && minutes==0 && secs==0) {
				output = 'now';
			}
			//var output	= format(hours)+'h '+format(minutes)+'m '+format(secs)+'s';
			//var output	= formatString.replace(/(hh)/, format(hours)).replace(/(mm)/, format(minutes)).replace(/(ss)/, format(secs));
			
			return t(output);
		};
	});
	window.appSettings.module.filter('timeago', function() {
		var service = {};
		
		service.settings = {
			refreshMillis: 60000,
			allowFuture: false,
			overrideLang : null,
			fullDateAfterSeconds : null,
			strings: {
				'en_US': {
					prefixAgo: null,
					prefixFromNow: null,
					suffixAgo: 'ago',
					suffixFromNow: 'from now',
					seconds: 'just now',
					minute: 'a minute',
					minutes: '%d minutes',
					hour: 'an hour',
					hours: '%d hours',
					day: 'a day',
					days: '%d days',
					month: 'a month',
					months: '%d months',
					year: 'a year',
					years: '%d years',
					numbers: []
				}
			}
		};
		
		service.inWords = function (distanceMillis, fromTime, format, timezone) {
		
			var fullDateAfterSeconds = parseInt(service.settings.fullDateAfterSeconds, 10);
		
			if (!isNaN(fullDateAfterSeconds)) {
				var fullDateAfterMillis = fullDateAfterSeconds * 1000;
				if ((distanceMillis >= 0 && fullDateAfterMillis <= distanceMillis) ||
				(distanceMillis < 0 && fullDateAfterMillis >= distanceMillis)) {
					if (format) {
						return $filter('date')(fromTime, format, timezone);
					}
					return fromTime;
				}
			}
		
			var overrideLang = service.settings.overrideLang;
			var documentLang = document.documentElement.lang;
			var sstrings = service.settings.strings;
			var lang, $l;
		
			if (typeof sstrings[overrideLang] !== 'undefined') {
				lang = overrideLang;
				$l = sstrings[overrideLang];
			} else if (typeof sstrings[documentLang] !== 'undefined') {
				lang = documentLang;
				$l = sstrings[documentLang];
			} else {
				lang = 'en_US';
				$l = sstrings[lang];
			}
		
			var prefix = $l.prefixAgo;
			var suffix = $l.suffixAgo;
			if (service.settings.allowFuture) {
				if (distanceMillis < 0) {
					prefix = $l.prefixFromNow;
					suffix = $l.suffixFromNow;
				}
			}
		
			var seconds = Math.abs(distanceMillis) / 1000;
			var minutes = seconds / 60;
			var hours = minutes / 60;
			var days = hours / 24;
			var years = days / 365;
		
			function substitute(stringOrFunction, number) {
				var string = angular.isFunction(stringOrFunction) ?
				stringOrFunction(number, distanceMillis) : stringOrFunction;
				var value = ($l.numbers && $l.numbers[number]) || number;
				return string.replace(/%d/i, value);
			}
		
			var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
			seconds < 90 && substitute($l.minute, 1) ||
			minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
			minutes < 90 && substitute($l.hour, 1) ||
			hours < 24 && substitute($l.hours, Math.round(hours)) ||
			hours < 42 && substitute($l.day, 1) ||
			days < 30 && substitute($l.days, Math.round(days)) ||
			days < 45 && substitute($l.month, 1) ||
			days < 365 && substitute($l.months, Math.round(days / 30)) ||
			years < 1.5 && substitute($l.year, 1) ||
			substitute($l.years, Math.round(years));
		
			var separator = $l.wordSeparator === undefined ?  ' ' : $l.wordSeparator;
			if(seconds < 60){
				return [prefix, words].join(separator).trim();
			} else {
				return [prefix, words, suffix].join(separator).trim();
			}
			
		};
		
		service.parse = function (input) {
			if (input instanceof Date){
				return input;
			} else if (angular.isNumber(input)) {
				return new Date(input);
			} else if (/^\d+$/.test(input)) {
				return new Date(parseInt(input, 10));
			} else {
				var s = (input || '').trim();
				s = s.replace(/\.\d+/, ''); // remove milliseconds
				s = s.replace(/-/, '/').replace(/-/, '/');
				s = s.replace(/T/, ' ').replace(/Z/, ' UTC');
				s = s.replace(/([\+\-]\d\d)\:?(\d\d)/, ' $1$2'); // -04:00 -> -0400
				return new Date(s);
			}
		};
		
		return function (value, format, timezone) {
			//ftl.log("value, format, timezone", value, format, timezone);
			var fromTime = service.parse(value);
			var diff = Date.now() - fromTime;
			return service.inWords(diff, fromTime, format, timezone);
			return 'blah';
		};
	});
	window.appSettings.module.filter('age', function() {
		var service = {};
		
		service.settings = {
			refreshMillis: 60000,
			allowFuture: false,
			overrideLang : null,
			fullDateAfterSeconds : null,
			strings: {
				'en_US': {
					prefixAgo: null,
					prefixFromNow: null,
					suffixAgo: '',
					suffixFromNow: '',
					seconds: 'less than a minute',
					minute: 'about a minute',
					minutes: '%d minutes',
					hour: 'about an hour',
					hours: 'about %d hours',
					day: 'a day',
					days: '%d days',
					month: 'about a month',
					months: '%d months',
					year: 'about a year',
					years: '%d years',
					numbers: []
				}
			}
		};
		
		service.inWords = function (distanceMillis, fromTime, format, timezone) {
		
			var fullDateAfterSeconds = parseInt(service.settings.fullDateAfterSeconds, 10);
		
			if (!isNaN(fullDateAfterSeconds)) {
				var fullDateAfterMillis = fullDateAfterSeconds * 1000;
				if ((distanceMillis >= 0 && fullDateAfterMillis <= distanceMillis) ||
				(distanceMillis < 0 && fullDateAfterMillis >= distanceMillis)) {
					if (format) {
						return $filter('date')(fromTime, format, timezone);
					}
					return fromTime;
				}
			}
		
			var overrideLang = service.settings.overrideLang;
			var documentLang = document.documentElement.lang;
			var sstrings = service.settings.strings;
			var lang, $l;
		
			if (typeof sstrings[overrideLang] !== 'undefined') {
				lang = overrideLang;
				$l = sstrings[overrideLang];
			} else if (typeof sstrings[documentLang] !== 'undefined') {
				lang = documentLang;
				$l = sstrings[documentLang];
			} else {
				lang = 'en_US';
				$l = sstrings[lang];
			}
		
			var prefix = $l.prefixAgo;
			var suffix = $l.suffixAgo;
			if (service.settings.allowFuture) {
				if (distanceMillis < 0) {
					prefix = $l.prefixFromNow;
					suffix = $l.suffixFromNow;
				}
			}
		
			var seconds = Math.abs(distanceMillis) / 1000;
			var minutes = seconds / 60;
			var hours = minutes / 60;
			var days = hours / 24;
			var years = days / 365;
		
			function substitute(stringOrFunction, number) {
				var string = angular.isFunction(stringOrFunction) ?
				stringOrFunction(number, distanceMillis) : stringOrFunction;
				var value = ($l.numbers && $l.numbers[number]) || number;
				return string.replace(/%d/i, value);
			}
		
			var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) ||
			seconds < 90 && substitute($l.minute, 1) ||
			minutes < 45 && substitute($l.minutes, Math.round(minutes)) ||
			minutes < 90 && substitute($l.hour, 1) ||
			hours < 24 && substitute($l.hours, Math.round(hours)) ||
			hours < 42 && substitute($l.day, 1) ||
			days < 30 && substitute($l.days, Math.round(days)) ||
			days < 45 && substitute($l.month, 1) ||
			days < 365 && substitute($l.months, Math.round(days / 30)) ||
			years < 1.5 && substitute($l.year, 1) ||
			substitute($l.years, Math.round(years));
		
			var separator = $l.wordSeparator === undefined ?  ' ' : $l.wordSeparator;
			return [prefix, words, suffix].join(separator).trim();
		};
		
		service.parse = function (input) {
			if (input instanceof Date){
				return input;
			} else if (angular.isNumber(input)) {
				return new Date(input);
			} else if (/^\d+$/.test(input)) {
				return new Date(parseInt(input, 10));
			} else {
				var s = (input || '').trim();
				s = s.replace(/\.\d+/, ''); // remove milliseconds
				s = s.replace(/-/, '/').replace(/-/, '/');
				s = s.replace(/T/, ' ').replace(/Z/, ' UTC');
				s = s.replace(/([\+\-]\d\d)\:?(\d\d)/, ' $1$2'); // -04:00 -> -0400
				return new Date(s);
			}
		};
		
		return function (value, format, timezone) {
			//ftl.log("value, format, timezone", value, format, timezone);
			var fromTime = service.parse(value);
			var diff = Date.now() - fromTime;
			return service.inWords(diff, fromTime, format, timezone);
			return 'blah';
		};
	});
})(window);