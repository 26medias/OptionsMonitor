const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pstack = require('pstack');

class StockData {
    /**
     * @param {string} dataDir - Directory to store JSON data
     */
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.apiKey = process.env.POLYGON_API_KEY || '';
        if (!this.apiKey) {
            console.warn('Warning: POLYGON_API_KEY not set.');
        }
    }

    /**
     * Returns the path for a given ticker/timeframe cache file
     * @param {string} ticker
     * @param {string} timeframe
     * @returns {string}
     */
    _getCachePath(ticker, timeframe) {
        return path.join(this.dataDir, `${ticker}_${timeframe.replace(/ /g, '_')}.json`);
    }

    /**
     * Parses timeframe like "1 minute", "5 minute", "1 day" into { multiplier, timespan }
     * @param {string} timeframe
     * @returns {{ multiplier: number, timespan: string }}
     */
    _parseTimeframe(timeframe) {
        //console.log("_parseTimeframe", timeframe)
        const parts = timeframe.split(' ');
        return { multiplier:parts[0], timespan:parts[1] };
    }

    /**
     * Reads cache from disk
     * @param {string} ticker
     * @param {string} timeframe
     * @returns {Array|null}
     */
    _readCache(ticker, timeframe) {
        const filePath = this._getCachePath(ticker, timeframe);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        }
        return null;
    }

    /**
     * Writes cache to disk
     * @param {string} ticker
     * @param {string} timeframe
     * @param {Array} data
     */
    _writeCache(ticker, timeframe, data) {
        const filePath = this._getCachePath(ticker, timeframe);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * Checks how long ago (in ms) the cache file was last updated
     * @param {string} ticker
     * @param {string} timeframe
     * @returns {number|null} Returns ms since last update, or null if no cache
     */
    lastRefresh(ticker, timeframe) {
        const filePath = this._getCachePath(ticker, timeframe);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        const stats = fs.statSync(filePath);
        return Date.now() - stats.mtimeMs;
    }

    /**
     * Fetches OHLC data from Polygon for a single ticker
     * @param {string} ticker
     * @param {string} timeframe
     * @param {Date} sinceDate
     * @returns {Promise<Array>}
     */
    async _fetchData(ticker, timeframe, sinceDate) {
        //console.log(timeframe, sinceDate)
        const { multiplier, timespan } = this._parseTimeframe(timeframe);
        const fromMs = sinceDate.getTime();
        const toMs = Date.now();

        const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fromMs}/${toMs}?apiKey=${this.apiKey}`;
        //console.log('Fetching data from', url);

        try {
            const resp = await axios.get(url);
            let results = resp.data && resp.data.results ? resp.data.results : [];
            results = results.map(bar => ({
                timestamp: new Date(bar.t).toISOString(),
                open: bar.o,
                high: bar.h,
                low: bar.l,
                close: bar.c,
                volume: bar.v
            }));
            if (results.length<50) {
                console.log({ticker, timeframe, sinceDate})
                console.log(results.length);
            }
            return results;
        } catch (err) {
            console.error(`Error fetching data for ${ticker}:`, err);
            return [];
        }
    }

    /**
     * Fetches and returns historical data since `sinceDate`
     * for one or many `tickers` using the specified `timeframe`.
     * 
     * @param {string|Array<string>} tickers - Single ticker or an array of tickers
     * @param {string} timeframe - e.g. "1 minute", "5 minute", "1 day"
     * @param {Date} [sinceDate=new Date()] - Start date to fetch data from
     * @param {boolean} [refresh=true] - If false, load only from cache (unless empty)
     * @returns {Promise<Object>} - { [ticker]: Array of data }
     */
    async get(tickers, timeframe, sinceDate = new Date(), refresh = true) {
        //console.log(`======== ${timeframe} - ${sinceDate} - ${refresh} ========`)
        const scope = this;
        if (!Array.isArray(tickers)) {
            tickers = [tickers];
        }

        const results = {};
        const stack = new pstack({
            async: true,
            progress: tickers.length > 1 ? "Downloading the data..." : false
        });

        tickers.forEach(ticker => {
            stack.add(async function(done) {
                try {
                    let data = [];
                    const cachedData = scope._readCache(ticker, timeframe);

                    if (!refresh && cachedData) {
                        // Load only from cache (filter by sinceDate)
                        data = cachedData.filter(item => new Date(item.timestamp) >= sinceDate);
                    } else {
                        // Fetch fresh data from API
                        data = await scope._fetchData(ticker, timeframe, sinceDate);
                        scope._writeCache(ticker, timeframe, data);
                    }
                    
                    results[ticker] = data;
                    done();
                } catch (err) {
                    console.error('Error in get() for', ticker, timeframe, err);
                    results[ticker] = [];
                    done();
                }
            });
        });

        return new Promise((resolve) => {
            stack.start(() => {
                resolve(results);
            });
        });
    }
}

module.exports = StockData;
