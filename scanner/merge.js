const Monitor = require('./Monitor');
const ObjectFilter = require('./ObjectFilter');
const { table } = require('table');
const _ = require('underscore');
var Gradient = require('./Gradient');

const project = "./data/merge/"
const monitor = new Monitor(project);
const MS_HOUR = 1000*60*60;
const MS_DAY = MS_HOUR*24;
const MS_WEEK = MS_DAY*7;

const tickers = ["NVDA"]


class PriceDataTransformer {
    constructor(rawData) {
        this.rawData = rawData;
    }

    /**
     * Helper function to group data by a callback that returns a key (e.g. "YYYY-WW" or "YYYY-MM").
     */
    groupDataBy(getGroupKey) {
        const grouped = {};

        for (let i = 0; i < this.rawData.length; i++) {
            const dataPoint = this.rawData[i];
            const date = new Date(dataPoint.timestamp);

            // Determine the group key (for example "2022-23" for ISO week, or "2022-06" for a month)
            const groupKey = getGroupKey(date);

            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(dataPoint);
        }

        // Now aggregate each group
        const result = [];
        for (const [key, items] of Object.entries(grouped)) {
            // Sort by timestamp to get correct open/close
            items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            const open = items[0].open;
            const close = items[items.length - 1].close;
            let high = Number.MIN_VALUE;
            let low = Number.MAX_VALUE;
            let volume = 0;

            items.forEach(item => {
                if (item.high > high) {
                    high = item.high;
                }
                if (item.low < low) {
                    low = item.low;
                }
                volume += item.volume;
            });

            // Use the first day's timestamp as the representative timestamp, or
            // compute your own "start-of-week" or "start-of-month" date here
            result.push({
                timestamp: items[0].timestamp,
                open,
                high,
                low,
                close,
                volume
            });
        }

        // Sort final array by actual date before returning
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return result;
    }

    /**
     * Returns ISO week number and year in "YYYY-WW" format.
     */
    static getIsoWeekKey(date) {
        // Clone date to avoid mutating
        const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        
        // ISO week day (1-7)
        const dayNum = tempDate.getUTCDay() || 7;
        // Set to Thursday of current week so that .getUTCFullYear() returns the correct year
        tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);

        // 1st January of this year
        const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
        // Calculate full weeks to the date
        const weekNum = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);

        const year = tempDate.getUTCFullYear();
        return `${year}-${String(weekNum).padStart(2, '0')}`;
    }

    /**
     * Group data by ISO week. 
     */
    getWeeklyData() {
        return this.groupDataBy(date => PriceDataTransformer.getIsoWeekKey(date));
    }

    /**
     * Group data by Month in "YYYY-MM" format.
     */
    getMonthlyData() {
        return this.groupDataBy(date => {
            const year = date.getUTCFullYear();
            // Month is zero-based, so +1 and pad
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            return `${year}-${month}`;
        });
    }
}



class TimeframeMerger {
    constructor(options) {
        options = {
            ticker: 'NVDA',
            refresh: false,
            keys: ['marketcycle', 'rsi'],
            ...options
        }
        this.options = options;
        this.monitor = new Monitor(options.project);
    }

    async merge() {
        const min_datapoints = 20;
        const scope = this;
        this.root_data = await this.monitor.stock.get([this.options.ticker], "1 day", new Date(new Date().getTime()-(MS_DAY*1000)), this.options.refresh);
        this.root_data = this.root_data[this.options.ticker];

        //const transformer = new PriceDataTransformer(this.root_data);
        //const weeklyData = transformer.getWeeklyData();
        //const monthlyData = transformer.getMonthlyData();

        //console.log(monthlyData)

        //console.log("Days of data:", data.length);
        this.merged = []

        this.root_data.forEach((item, n) => {
            //if (n>5) return;
            scope.tick(n)
        })

        console.log(this.merged)
    }

    tick(n) {
        let data = this.root_data.slice(0, n+1);
        //console.log(data.length)
        const transformer = new PriceDataTransformer(data);
        let weeklyData = transformer.getWeeklyData();
        let monthlyData = transformer.getMonthlyData();

        if (this.options.transform) {
            weeklyData = this.options.transform(weeklyData);
            monthlyData = this.options.transform(monthlyData);
        }

        const weekLast = weeklyData[weeklyData.length-1];
        const monthLast = monthlyData[monthlyData.length-1];

        let keys = {};
        this.options.keys.forEach(key => {
            keys[`${key}_week`] = weekLast[key];
            keys[`${key}_month`] = monthLast[key];
        })
        
        this.merged.push({
            ...this.root_data[n],
            timestamp_week: weekLast.timestamp,
            timestamp_month: monthLast.timestamp,
            ...keys
        })
    }



}


const main = async() => {
    //let data = await monitor.stock.get(tickers, "1 day", new Date(new Date().getTime()-(MS_DAY*1000)), false);
    //data = data.NVDA;
    //console.log("Days of data:", data.length);

    const merger = new TimeframeMerger({
        keys: ['marketcycle', 'rsi'],
        transform: function(data) {
            return monitor.applyTransform(data)
        }
    });
    merger.merge()
}
main();
