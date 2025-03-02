const Monitor = require('./Monitor');
const ObjectFilter = require('./ObjectFilter');
var Gradient = require('./Gradient');
const _ = require('underscore');
const fs = require('fs');
const path = require('path');

const defaultProject = "./data/dr2025/"
const gradient = new Gradient();

const MS_HOUR = 1000 * 60 * 60;
const MS_DAY = MS_HOUR * 24;
const MS_WEEK = MS_DAY * 7;

class FileHelper {
    static base64Image(filePath) {
        console.log(">> ", filePath, fs.existsSync(filePath))
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath);
            return data.toString('base64');
        }
        return null;
    }
}

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
        },
        charts: {
            charts: async function(options, callback) {
                options = {
                    tickers: [],
                    timeframe: "1 hour",
                    days: 5,
                    refresh: true,
                    ...options
                }
                const monitor = new Monitor(options.project || defaultProject);
                let data = await monitor.stock.get(
                    options.tickers,
                    options.timeframe,
                    new Date(new Date().getTime() - (MS_DAY * options.days)),
                    options.refresh
                );
                data = monitor.applyTransforms(data);
                const dir = "charts/" + options.timeframe.replace(' ', '_');
                console.log(dir)
                const chartFilenames = monitor.generateCharts(data, dir);

                let output = [];
                let ticker;
                for (ticker in chartFilenames) {
                    output.push({
                        ticker,
                        chart: FileHelper.base64Image(chartFilenames[ticker])
                    })
                }

                /*const tickers = Object.keys(data);

                for (const ticker of tickers) {
                    const filePath = path.join(dir, `${ticker}.png`);
                    const base64Str = FileHelper.base64Image(filePath);
                    if (base64Str) {
                        output[ticker] = base64Str;
                    }
                }*/
                callback(output);
            }
        }
	};
};

module.exports	= lib;
