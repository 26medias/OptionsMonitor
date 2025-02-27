const fs = require('fs');
const path = require('path');
const pstack = require('pstack');
const _ = require('underscore');
var progressbar 	= require('progress');
var colors = require('colors');

const Watchlist = require('./Watchlist');
const Options = require('./Options');
const StockData = require('./StockData');
const RedditTracker = require('./RedditTracker');
const NewsLoader = require('./NewsLoader');
const MarketCycle = require('./MarketCycle');
var Gradient = require('./Gradient');
var NodeChart = require('./NodeChart');
var MarketSR = require('./MarketSR');


const MS_HOUR = 1000*60*60;
const MS_DAY = MS_HOUR*24;
const MS_WEEK = MS_DAY*7;

class Monitor {
    constructor(data_dir) {
        this.data_dir = data_dir;
        this.watchlist = new Watchlist(this.data_dir+"/watchlist");
        this.stock = new StockData(this.data_dir+"/stock");
        this.options = new Options();
        this.reddit = new RedditTracker(this.data_dir+"/reddit")
        this.news = new NewsLoader(this.data_dir+"/news");
    }

    init() {

    }

    // Get stock data
    async getStockData(ticker, refresh=true, timeframe="1 day") {
        return await this.stock.get(ticker, timeframe, new Date(new Date().getTime()-(MS_DAY*100)), refresh);
    }

    // Get the augmented stock data (indicators added)
    async getAugmentedStockData(ticker, refresh=true) {
        let data = await this.getStockData(ticker, refresh);
        data = data[ticker];
        const MC = new MarketCycle(data.map(item => item.close));
        const marketcycles = MC.mc(14, 20);
        const rsi = MC.RSI(14);
        data = data.map((item, n) => {
            return {
                ...item,
                rsi: rsi[n],
                marketcycle: marketcycles[n]
            }
        })
        return data;
    }

    // List all available options for a ticker
    async getOptions(ticker, strikeWithinPercent=10, maxPercentPerDay=2, minDaysAway=10, refresh=true) {
        const scope = this;
        const filename = `options/${ticker}-within-${strikeWithinPercent}.json`;
        if (!refresh && fs.existsSync(`${this.data_dir}/${filename}`)) {
            return this.read(filename);
        } else {
            let output = [];
            const data = await this.stock.get(ticker, "1 minute", new Date(new Date().getTime()-(MS_DAY*10)), refresh);
            const last = data[ticker][data[ticker].length-1];
            //return last
            let expirations = await this.options.getExpirations(ticker);
            expirations = expirations.filter(item => {
                return (new Date(item).getTime() - new Date().getTime())/MS_DAY >= minDaysAway
            });

            const percents = (v, s) => {
                return parseFloat(((s - v)/v*100).toFixed(2));
            }
        
            // Process expirations in parallel
            for (const date of expirations) {
                const formattedDate = this.packDate(date);
                let contracts = await this.options.getAvailableContracts(ticker, formattedDate);
                contracts = contracts
                    // Limit the strike price within range
                    .filter(item => Math.abs(percents(last.close, item.strike)) <= strikeWithinPercent)
                    // Call options only
                    .filter(item => item.optionType == "C")
                    // Setup new keys
                    .map(item => {
                        const expiration = scope.unpackDate(item.expiration);
                        const expiration_ms = expiration-new Date().getTime();
                        const percentAboveStrike = percents(last.close, item.strike);
                        return {
                            ...item,
                            strike: item.strike,
                            currentClose: last.close,
                            expireIn: scope.formatMs(expiration_ms),
                            pricePerContract: parseFloat((item.price * 100).toFixed(2)),
                            percentAboveStrike: percentAboveStrike,
                            expiration: expiration,
                            percentPerDay: parseFloat((percentAboveStrike/(expiration_ms/MS_DAY)).toFixed(2))
                        }
                    })
                    // Filter on abverage percent per day
                    .filter(item => item.percentPerDay <= maxPercentPerDay);
                
                output = [
                    ...output,
                    ...contracts
                ]
            }

            // Sort by cost
            output.sort((a, b) => {
                return a.price > b.price ? 1 : -1;
            })
        
            this.write(filename, output);
            return output;
        }
    }
    
    // Get the reddit stats
    async getRedditStats(ticker, refresh=true, pages=10) {
        if (refresh) {
            await this.reddit.refresh(pages);
        }
        
        return this.reddit.get(ticker) || false;
    }
    
    // Get the news
    async getNews(ticker, days=7) {
        await this.news.refresh({
            days,
            limit: 1000,
            symbols: [ticker]
        });
        
        return this.news.getByTicker(ticker);
    }
    

    // ------------

    packDate(date) {
        return date.getFullYear() + '-' +
            String(date.getMonth() + 1).padStart(2, '0') + '-' +
            String(date.getDate()).padStart(2, '0');
    }

    unpackDate(compactDate = "20250221") {
        if (typeof compactDate !== "string" || compactDate.length !== 8) {
            throw new Error("Invalid compact date format. Expected 'YYYYMMDD'.");
        }
    
        const year = parseInt(compactDate.slice(0, 4), 10);
        const month = parseInt(compactDate.slice(4, 6), 10) - 1; // Months are 0-based in JS
        const day = parseInt(compactDate.slice(6, 8), 10);
    
        return new Date(year, month, day);
    }

    formatMs(ms) {
        if (ms < 0) return "in the past"; // Handle negative values
    
        if (ms < 86400000) { // If less than 24 hours, return hours & minutes
            return humanizeDuration(ms, { units: ['h', 'm'], round: true });
        }
    
        // If more than 1 day, use weeks & days format
        const weeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
        const days = Math.floor((ms % (7 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
    
        if (weeks > 0 && days > 0) {
            return `${weeks} week${weeks > 1 ? 's' : ''} & ${days} day${days > 1 ? 's' : ''}`;
        } else if (weeks > 0) {
            return `${weeks} week${weeks > 1 ? 's' : ''}`;
        } else {
            return `${days} day${days > 1 ? 's' : ''}`;
        }
    }
    
    write(filename, data) {
        const filePath = path.join(this.data_dir, filename);
        const dirPath = path.dirname(filePath);
        
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        try {
            let content;
            if (typeof data === 'object') {
                content = JSON.stringify(data, null, 4);
            } else {
                content = String(data);
            }
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (error) {
            console.error(`Error writing file ${filename}:`, error);
        }
    }

    read(filename) {
        const filePath = path.join(this.data_dir, filename);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filename}`);
            return null;
        }
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            try {
                return JSON.parse(content);
            } catch (error) {
                return content;
            }
        } catch (error) {
            console.error(`Error reading file ${filename}:`, error);
            return null;
        }
    }

    // ------------

    // Scan the options available and return the best ones
    scanOptions(strikeWithinPercent=10, maxPercentPerDay=2, minDaysAway=10, callback=()=>{}, refresh=true) {
        const scope = this;
        const tickers = Object.keys(this.watchlist.list());
        console.log(tickers)
        const output = [];
        const stack = new pstack({
            async: true,
            //batch: 10,
            progress: 'Scanning...'
        });
    
        for (const ticker of tickers) {
            stack.add(async function(done, ticker) {
                try {
                    let options = await scope.getOptions(ticker, strikeWithinPercent, maxPercentPerDay, minDaysAway, refresh);
                    
                    if (options.length === 0) {
                        return done();
                    }
        
                    let cheapest = options[0];
                    output.push(cheapest);
                    
                } catch (error) {
                    console.error(`Error fetching options for ${ticker}:`, error.message);
                }
                done();
            }, ticker)
        }

        stack.start(function() {
            output.sort((a, b) => {
                return a.pricePerContract > b.pricePerContract ? 1 : -1;
            })
            callback(output);
        })
        
    }

    addMissingCandle(dataToFix, minuteData, timeframe) {
        const tickers = Object.keys(this.watchlist.list());
        for (const ticker of tickers) {
            const last       = dataToFix[ticker][dataToFix[ticker].length-1];
            const lastMinute = minuteData[ticker][minuteData[ticker].length-1];
            const lastAgo    = new Date(lastMinute.timestamp).getTime()-new Date(last.timestamp).getTime();
            let overwrite = false;
            
            if (lastAgo < MS_HOUR && timeframe=="hour") {
                overwrite = true;
            }
            if (lastAgo < MS_DAY && timeframe=="day") {
                overwrite = true;
            }
            if (lastAgo < MS_WEEK && timeframe=="week") {
                overwrite = true;
            }
            if (timeframe=="month" && new Date(last.timestamp).getMonth() == new Date(lastMinute.timestamp).getMonth()) {
                overwrite = true;
            }
            const newData = {
                "timestamp": lastMinute.timestamp,
                "open": last.close,
                "high": Math.max(last.close, lastMinute.close),
                "low": Math.min(last.close, lastMinute.close),
                "close": lastMinute.close,
                "volume": 0
            }

            if (overwrite) {
                dataToFix[ticker][dataToFix[ticker].length-1] = {
                    ...newData,
                    action: "overwrite"
                }
            } else {
                dataToFix[ticker].push({
                    ...newData,
                    action: "push"
                })
            }
        }
        return dataToFix;
    }

    // build data
    async buildStockData(options) {
        const scope = this;

        // tickers, refreshDay=true, refreshWeek=true, refreshMonth=true, refreshOptions=true
        options = {
            tickers: [],
            refreshMinute: true,
            refreshHour: true,
            refreshDay: true,
            refreshWeek: true,
            refreshMonth: true,
            refreshOptions: true,
            refreshReddit: true,
            refreshNews: true,
            optionsPercentFromStrike: 5,
            optionsPercentPerDay: 1,
            optionsminDaysAway: 160,
            ...options
        }
        console.log(options)

        const info = scope.read("scan/info.json") || {};
        
        const tickers = options.tickers;
        const stack = new pstack();

        let data_minute = {};
        let data_hour = {};
        let data_day = {};
        let data_week = {};
        let data_month = {};
        

        if (options.refreshReddit) {
            stack.add(async function(done) {
                await scope.reddit.refresh(15);
                console.log("Reddit done.")
                info.refreshed_reddit = new Date();
                done();
            });
        }
        if (options.refreshNews) {
            stack.add(async function(done) {
                await scope.news.refresh({
                    days: 30,
                    limit: 1000,
                    symbols: tickers
                });
                console.log("News done.")
                info.refreshed_news = new Date();
                done();
            });
        }

        stack.add(async function(done) {
            console.log("------> ", MS_DAY*100, new Date(new Date().getTime()-(MS_DAY*100)))
            // Download the stock data
            data_minute   = await scope.stock.get(tickers, "1 minute", new Date(new Date().getTime()-(MS_DAY*5)), options.refreshMinute);
            if (options.refreshMinute) {
                info.refreshed_minute = new Date();
            }
            console.log("Minute done")
            data_hour   = await scope.stock.get(tickers, "1 hour", new Date(new Date().getTime()-(MS_DAY*7)), options.refreshHour);
            if (options.refreshHour) {
                info.refreshed_hour = new Date();
            }
            console.log("Hour done")
            data_day   = await scope.stock.get(tickers, "1 day", new Date(new Date().getTime()-(MS_DAY*100)), options.refreshDay);
            if (options.refreshDay) {
                info.refreshed_day = new Date();
            }
            console.log("Day done")
            data_week  = await scope.stock.get(tickers, "1 week", new Date(new Date().getTime()-(MS_WEEK*100)), options.refreshWeek);
            if (options.refreshWeek) {
                info.refreshed_week = new Date();
            }
            console.log("Week done")
            data_month = await scope.stock.get(tickers, "1 month", new Date(new Date().getTime()-(MS_WEEK*400)), options.refreshMonth);
            if (options.refreshMonth) {
                info.refreshed_month = new Date();
            }
            console.log("Month done")

            // Fix the data, add the latest datapoint
            data_hour = scope.addMissingCandle(data_hour, data_minute, "hour")
            data_day = scope.addMissingCandle(data_day, data_minute, "day")
            data_week = scope.addMissingCandle(data_week, data_minute, "week")
            data_month = scope.addMissingCandle(data_month, data_minute, "month")
            
            // Apply the transforms
            data_hour    = scope.applyTransforms(data_hour);
            data_day    = scope.applyTransforms(data_day);
            data_week   = scope.applyTransforms(data_week);
            data_month  = scope.applyTransforms(data_month);
            console.log("Transforms done")
            
            // Save the data
            scope.write("scan/data_minute.json", data_minute);
            scope.write("scan/data_hour.json", data_hour);
            scope.write("scan/data_day.json", data_day);
            scope.write("scan/data_week.json", data_week);
            scope.write("scan/data_month.json", data_month);
            console.log("Saves done")

            // Generate the charts
            /*if (options.refreshMinute) {
                scope.generateCharts(data_minute, "scan/charts/minute");
                console.log("minute charts done.")
            }

            if (options.refreshHour) {
                scope.generateCharts(data_hour, "scan/charts/hour");
                console.log("hour charts done.")
            }

            if (options.refreshDay) {
                scope.generateCharts(data_day, "scan/charts/day");
                console.log("day charts done.")
            }
            
            if (options.refreshWeek) {
                scope.generateCharts(data_week, "scan/charts/week");
                console.log("week charts done.")
            }
            
            if (options.refreshMonth) {
                scope.generateCharts(data_month, "scan/charts/month");
                console.log("month charts done.")
            }*/

            console.log("Stock data done.")
            done();
        })
        
        let optionsData = {};

        stack.add(async function(done) {
            scope.scanOptions(options.optionsPercentFromStrike || 5/*% from strike*/, options.optionsPercentPerDay || 1/*%/day*/, options.optionsminDaysAway || 160/*min days away*/, function(output) {
                //console.log(output);

                scope.write("scan/options.json", output);

                optionsData = _.indexBy(output, "underlying");

                console.log("Options done.")

                if (options.refreshOptions) {
                    info.refreshed_options = new Date();
                }
                
                done();
            }, options.refreshOptions);
        });

        let merged = {}
        stack.add(async function(done) {

            tickers.forEach(ticker => {
                merged[ticker] = {
                    ticker,
                    minute: data_minute[ticker][data_minute[ticker].length-1],
                    hour: data_hour[ticker][data_hour[ticker].length-1],
                    day: data_day[ticker][data_day[ticker].length-1],
                    week: data_week[ticker][data_week[ticker].length-1],
                    month: data_month[ticker][data_month[ticker].length-1],
                    minute_prev: data_minute[ticker][data_minute[ticker].length-2],
                    hour_prev: data_hour[ticker][data_hour[ticker].length-2],
                    day_prev: data_day[ticker][data_day[ticker].length-2],
                    week_prev: data_week[ticker][data_week[ticker].length-2],
                    month_prev: data_month[ticker][data_month[ticker].length-2],
                    option: optionsData[ticker]
                }
                try {
                    merged[ticker] = {
                        ...merged[ticker],
                        minute_diff: {
                            marketcycle: merged[ticker].minute ? merged[ticker].minute.marketcycle-merged[ticker].minute_prev.marketcycle : null,
                            rsi: merged[ticker].minute ? merged[ticker].minute.rsi-merged[ticker].minute_prev.rsi : null,
                        },
                        hour_diff: {
                            marketcycle: merged[ticker].hour ? merged[ticker].hour.marketcycle-merged[ticker].hour_prev.marketcycle : null,
                            rsi: merged[ticker].hour ? merged[ticker].hour.rsi-merged[ticker].hour_prev.rsi : null,
                        },
                        day_diff: {
                            marketcycle: merged[ticker].day ? merged[ticker].day.marketcycle-merged[ticker].day_prev.marketcycle : null,
                            rsi: merged[ticker].day ? merged[ticker].day.rsi-merged[ticker].day_prev.rsi : null,
                        },
                        week_diff: {
                            marketcycle: merged[ticker].week ? merged[ticker].week.marketcycle-merged[ticker].week_prev.marketcycle : null,
                            rsi: merged[ticker].week ? merged[ticker].week.rsi-merged[ticker].week_prev.rsi : null
                        },
                        month_diff: {
                            marketcycle: merged[ticker].month ? merged[ticker].month.marketcycle-merged[ticker].month_prev.marketcycle : null,
                            rsi: merged[ticker].month ? merged[ticker].month.rsi-merged[ticker].month_prev.rsi : null
                        },
                        reddit: scope.reddit.get(ticker),
                        news: scope.news.getByTicker(ticker)
                    }
                } catch(e) {
                    console.log(e)
                    console.log(merged[ticker])
                }
            })
            scope.write("scan/scan.json", merged);
            scope.write("scan/info.json", {
                ...info,
                refreshed: new Date()
            });

            console.log("Merge done.")
            done();
        });

        return new Promise((resolve) => {
            stack.start(() => {
                resolve(merged);
            });
        });
    }

    applyTransforms(stockData) {
        const tickers = Object.keys(stockData);
        tickers.forEach(ticker => {
            let data = stockData[ticker];
            const MC = new MarketCycle(data.map(item => item.close));
            const marketcycles = MC.mc(14, 20);
            const rsi = MC.RSI(14);
            data = data.map((item, n) => {
                return {
                    ...item,
                    rsi: rsi[n],
                    marketcycle: marketcycles[n]
                }
            })
            stockData[ticker] = data;
        })
        return stockData;
    }
    getMinMax(data) {
        let min = Infinity;
        let max = -Infinity;
    
        for (const { open, high, low, close } of data) {
            min = Math.min(min, open, high, low, close);
            max = Math.max(max, open, high, low, close);
        }
    
        return { min, max };
    };
    generateChart(filename, data, width=800, height=600) {
        //console.log(data)
        const chart = new NodeChart({
            width: width,
            height: height,
            backgroundColor: {r: 21, g:23, b:34, a: 255},
            data: data,
            padding: 30,      // 10px padding around the edge of the canvas
            panelGap: 10,     // 10px gap between panels
            renderAxis: {
                x: false,    // Do not render the x axis
                y: true      // Render the y axis
            }
        });
    
        //console.log(data.length, filename)
    
    
        const sr = new MarketSR(data);
    
        const supports = sr.supports()
        const resistances = sr.resistances()
        const minMax = this.getMinMax(data);
    
        //console.log({resistances, supports})
    
    
        const lines = [];
    
        lines.push({
            id: `max`,
            type: "horizontal-line",
            data: {
                value: minMax.max
            },
            color: { r: 255, g: 255, b: 255, a: 255 }
        })
        lines.push({
            id: `min`,
            type: "horizontal-line",
            data: {
                value: minMax.min
            },
            color: { r: 255, g: 255, b: 255, a: 255 }
        })
    
        supports.forEach(item => {
            //item.weight==1 ? 100 : 100
            if (item.weight > 1) {
                lines.push({
                    id: `support-${item.level.toFixed(2)}`,
                    type: "horizontal-line",
                    data: {
                        value: parseFloat(item.level.toFixed(2))
                    },
                    color: { r: 74, g: 164, b: 154, a: 50 },
                    thickness: item.weight==1 ? 1 : 2
                })
            }
            
        })
        resistances.forEach(item => {
            if (item.weight > 1) {
                lines.push({
                    id: `resistance-${item.level.toFixed(2)}`,
                    type: "horizontal-line",
                    data: {
                        value: parseFloat(item.level.toFixed(2))
                    },
                    color: { r: 226, g: 96, b: 83, a: 50 },
                    thickness: item.weight==1 ? 1 : 2
                })
            }
        })
    
        chart.addPanel({
            id: "stock-data",
            height: 70,
            plots: [
                {
                    id: "candles",
                    type: "candlesticks",
                    width: 5, // candle width in px
                    gap: 2,   // gap between candles (optional)
                    data: {
                        open: "open",
                        high: "high",
                        low: "low",
                        close: "close"
                    },
                    color: {
                        up: { r: 74, g: 164, b: 154, a: 255 },
                        down: { r: 226, g: 96, b: 83, a: 255 }
                    }
                },
                ...lines
            ]
        });
        
        chart.addPanel({
            id: "marketcycle",
            height: 30,
            min: 0,
            max: 100,
            plots: [
                {
                    id: "100",
                    type: "horizontal-line",
                    data: {
                        value: 100
                    },
                    color: { r: 255, g: 255, b: 255, a: 100 }
                },
                {
                    id: "overbought",
                    type: "horizontal-line",
                    data: {
                        value: 80
                    },
                    color: { r: 226, g: 96, b: 83, a: 255 }
                },
                {
                    id: "50",
                    type: "horizontal-line",
                    data: {
                        value: 50
                    },
                    color: { r: 255, g: 255, b: 255, a: 50 }
                },
                {
                    id: "oversold",
                    type: "horizontal-line",
                    data: {
                        value: 20
                    },
                    color: { r: 74, g: 164, b: 154, a: 255 }
                },
                {
                    id: "0",
                    type: "horizontal-line",
                    data: {
                        value: 0
                    },
                    color: { r: 255, g: 255, b: 255, a: 100 }
                },
                {
                    id: "marketcycle",
                    type: "spline",
                    data: {
                        value: "marketcycle"
                    },
                    color: { r: 255, g: 255, b: 255, a: 255 }
                },
            ]
        });
        
        chart.addPanel({
            id: "RSI",
            height: 30,
            min: 0,
            max: 100,
            plots: [
                {
                    id: "100",
                    type: "horizontal-line",
                    data: {
                        value: 100
                    },
                    color: { r: 255, g: 255, b: 255, a: 100 }
                },
                {
                    id: "overbought",
                    type: "horizontal-line",
                    data: {
                        value: 80
                    },
                    color: { r: 226, g: 96, b: 83, a: 255 }
                },
                {
                    id: "50",
                    type: "horizontal-line",
                    data: {
                        value: 50
                    },
                    color: { r: 255, g: 255, b: 255, a: 50 }
                },
                {
                    id: "oversold",
                    type: "horizontal-line",
                    data: {
                        value: 20
                    },
                    color: { r: 74, g: 164, b: 154, a: 255 }
                },
                {
                    id: "0",
                    type: "horizontal-line",
                    data: {
                        value: 0
                    },
                    color: { r: 255, g: 255, b: 255, a: 100 }
                },
                {
                    id: "marketcycle",
                    type: "spline",
                    data: {
                        value: "rsi"
                    },
                    color: { r: 255, g: 255, b: 255, a: 255 }
                },
            ]
        });
    
        const stockBox = chart.getBoundingBox('stock-data')
        const rsiBox = chart.getBoundingBox('RSI')
        const mcBox = chart.getBoundingBox('marketcycle')
    
        // Box backgrounds
        chart.canvas.rect(rsiBox.x, rsiBox.y, rsiBox.width, rsiBox.height, {r: 35, g:39, b:49, a: 100}, true);
        chart.canvas.rect(mcBox.x, mcBox.y, mcBox.width, mcBox.height, {r: 35, g:39, b:49, a: 100}, true);
    
        chart.render()
    
        const marginX = 5;
        const marginY = -3;
    
        // Render the panels labels
        const mcMax = chart.getCoordinates(data.length-1, "marketcycle", "100");
        chart.canvas.write(mcMax.x+marginX, mcMax.y+marginY, "100", { r: 255, g: 255, b: 255, a: 100 })
    
        const mcMid = chart.getCoordinates(data.length-1, "marketcycle", "50");
        chart.canvas.write(mcMid.x+marginX, mcMid.y+marginY, "50", { r: 255, g: 255, b: 255, a: 100 })
    
        const mcMin = chart.getCoordinates(data.length-1, "marketcycle", "0");
        chart.canvas.write(mcMin.x+marginX, mcMin.y+marginY, "0", { r: 255, g: 255, b: 255, a: 100 })
    
        const mcUp = chart.getCoordinates(data.length-1, "marketcycle", "overbought");
        chart.canvas.write(mcUp.x+marginX, mcUp.y+marginY, "70", { r: 226, g: 96, b: 83, a: 255 })
    
        const mcDn = chart.getCoordinates(data.length-1, "marketcycle", "oversold");
        chart.canvas.write(mcDn.x+marginX, mcDn.y+marginY, "30", { r: 74, g: 164, b: 154, a: 255 })
    
        chart.canvas.write(mcBox.x+5, mcBox.y+10, "MARKETCYCLE: "+data[data.length-1].marketcycle.toFixed(2), { r: 255, g: 255, b: 255, a: 255 }, {font: 'large'})
    
    
    
        const rsiMax = chart.getCoordinates(data.length-1, "RSI", "100");
        chart.canvas.write(rsiMax.x+marginX, rsiMax.y+marginY, "100", { r: 255, g: 255, b: 255, a: 100 })
    
        const rsiMid = chart.getCoordinates(data.length-1, "RSI", "50");
        chart.canvas.write(rsiMid.x+marginX, rsiMid.y+marginY, "50", { r: 255, g: 255, b: 255, a: 100 })
    
        const rsiMin = chart.getCoordinates(data.length-1, "RSI", "0");
        chart.canvas.write(rsiMin.x+marginX, rsiMin.y+marginY, "0", { r: 255, g: 255, b: 255, a: 100 })
    
        const rsiUp = chart.getCoordinates(data.length-1, "RSI", "overbought");
        chart.canvas.write(rsiUp.x+marginX, rsiUp.y+marginY, "70", { r: 226, g: 96, b: 83, a: 255 })
    
        const rsiDn = chart.getCoordinates(data.length-1, "RSI", "oversold");
        chart.canvas.write(rsiDn.x+marginX, rsiDn.y+marginY, "30", { r: 74, g: 164, b: 154, a: 255 })
    
        chart.canvas.write(rsiBox.x+5, rsiBox.y+10, "RSI: "+data[data.length-1].rsi.toFixed(2), { r: 255, g: 255, b: 255, a: 255 }, {font: 'large'})
    
        // SR labels
        supports.forEach(item => {
            if (item.weight > 1) {
                const color = { r: 74, g: 164, b: 154, a: item.weight==1 ? 100 : 200 };
                const name = `support-${item.level.toFixed(2)}`
                const lineCoords = chart.getCoordinates(data.length-1, "stock-data", name);
                chart.canvas.write(lineCoords.x+marginX, lineCoords.y+marginY, item.level.toFixed(2), color)
            }
        });
        resistances.forEach(item => {
            if (item.weight > 1) {
                const color = { r: 226, g: 96, b: 83, a: item.weight==1 ? 100 : 200 };
                const name = `resistance-${item.level.toFixed(2)}`
                const lineCoords = chart.getCoordinates(data.length-1, "stock-data", name);
                chart.canvas.write(lineCoords.x+marginX, lineCoords.y+marginY, item.level.toFixed(2), color)
            }
        });
    
        // Min/max
        const maxCoords = chart.getCoordinates(data.length-1, "stock-data", "max");
        chart.canvas.write(maxCoords.x+marginX, maxCoords.y+marginY, minMax.max.toFixed(2), { r: 255, g: 255, b: 255, a: 255 })
        const minCoords = chart.getCoordinates(data.length-1, "stock-data", "min");
        chart.canvas.write(minCoords.x+marginX, minCoords.y+marginY, minMax.min.toFixed(2), { r: 255, g: 255, b: 255, a: 255 })
    
        // Price
        chart.canvas.write(stockBox.x+marginX, stockBox.y-20, "Current price: "+data[data.length-1].close.toFixed(2), { r: 255, g: 255, b: 255, a: 255 }, {font: 'large'})
        
        chart.save(filename);
        return filename;
    }
    
    generateCharts(data, filepath) {
        const scope = this;
        Object.keys(data).forEach(ticker => {
            try {
                scope.generateChart(`${scope.data_dir}/${filepath}/${ticker}.png`, data[ticker]);
            } catch(e) {
                console.log(`Chart error: ${ticker} - ${filepath}`)
            }
        });
        return;
    }
}

module.exports = Monitor;
/*
*/

if (require.main === module) {
    const main = async () => {
        const monitor = new Monitor("./data/test");
        const stats = await monitor.getRedditStats("PLTR", false);
        console.log(stats)
        //const news = await monitor.getNews("PLTR", 1);
        //console.log(news)
        const indicators = await monitor.getAugmentedStockData("PLTR", true);
        console.log(indicators)
        
        /*let options = await monitor.getOptions("DVN", 20, 160);
        options.sort((a, b) => {
            return a.price > b.price;
        })
        console.log(options.slice(0, 20))
        cheapest = options[0];
        console.log(`Cheapest option: $${cheapest.pricePerContract}`)
        console.log(cheapest)*/


        //const data = await monitor.getStockData("INTC");
        //console.log(data);
    }

    main();
}