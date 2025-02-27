const Monitor = require('./Monitor');
const ObjectFilter = require('./ObjectFilter');
var Gradient = require('./Gradient');
const _ = require('underscore');

const defaultProject = "./data/dr2025/"
const gradient = new Gradient();

const MS_HOUR = 1000*60*60;
const MS_DAY = MS_HOUR*24;
const MS_WEEK = MS_DAY*7;

lib = function(core) {
	return {
        scanner: {
            refresh: async function(options, callback) {
                const monitor = new Monitor(options.project || defaultProject);

                const tickers = Object.keys(monitor.watchlist.list());
                await monitor.buildStockData({
                    tickers,
                    ...options
                }, true);
                return callback({
                    "status": "refreshing"
                })
            },
            filter: async function(options, callback) {
                console.log(options)
                const monitor = new Monitor(options.project || defaultProject);
                let data = monitor.read("scan/scan.json");
                let info = monitor.read("scan/info.json");
                if (!data) {
                    return callback({
                        "error": true,
                        "message": "No data"
                    })
                }
                const filters = new ObjectFilter();
    
                data = _.values(data);
    
                /*const longTermBuys = filters.create(function(day, week, month, maxPrice) {
                    return {
                        "day.marketcycle": { "<=": day },
                        "week.marketcycle": { "<=": week },
                        "month.marketcycle": { "<=": month },
                        "option.pricePerContract": { "<=": maxPrice }
                    };
                });*/
    
                //const filteredData = longTermBuys(data, [options.day || 100, options.week || 100, options.month || 100, options.price || 10000]); // [day, week, month, maxPrice]
                
                return callback({
                    data,
                    ...info
                })
            }
        }
	};
};

module.exports	= lib;
