const fs = require('fs');
const path = require('path');
const _ = require('underscore');

const Watchlist = require('./Watchlist');
const Options = require('./Options');
const StockData = require('./StockData');
const RedditTracker = require('./RedditTracker');
const NewsLoader = require('./NewsLoader');
const MarketCycle = require('./MarketCycle');


const MS_HOUR = 1000*60*60;
const MS_DAY = MS_HOUR*24;

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
    async getStockData(ticker, refresh=true) {
        return await this.stock.get(ticker, "1 day", new Date(new Date().getTime()-(MS_DAY*100)), refresh);
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
        let output = [];
        const data = await this.stock.get(ticker, "1 day", new Date(new Date().getTime()-(MS_DAY*10)), refresh);
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
    
        this.write(`options/${ticker}-within-${strikeWithinPercent}.json`, output);
        return output;
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