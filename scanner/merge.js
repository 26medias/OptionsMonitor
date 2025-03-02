const Monitor = require('./Monitor');
const ObjectFilter = require('./ObjectFilter');
const { table } = require('table');
const _ = require('underscore');
var Gradient = require('./Gradient');

const project = "./data/merge/"
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

    async merge(filename) {
        const scope = this;
        const since = new Date(2008, 1, 1);//new Date(new Date().getTime()-(MS_DAY*10000));
        this.root_data = await this.monitor.stock.get([this.options.ticker], "1 day", since, this.options.refresh);
        this.root_data = this.root_data[this.options.ticker];

        if (this.options.transform) {
            this.root_data = this.options.transform(this.root_data);
        }

        this.merged = []

        this.root_data.forEach((item, n) => {
            scope.tick(n)
        })
        console.log(this.merged.length)
        this.monitor.write(filename, this.merged)
    }

    tick(n) {
        let data = this.root_data.slice(0, n+1);

        const transformer = new PriceDataTransformer(data);
        let weeklyData = transformer.getWeeklyData();
        let monthlyData = transformer.getMonthlyData();

        if (this.options.transform) {
            weeklyData = this.options.transform(weeklyData);
            monthlyData = this.options.transform(monthlyData);
        }

        const weekLast = weeklyData[weeklyData.length-1];
        const monthLast = monthlyData[monthlyData.length-1];

        let hasNull = false;
        let keys = {};
        
        this.options.keys.forEach(key => {
            keys[`${key}_day`] = data.slice(-10).map(item => item[key])//weekLast[key];
            keys[`${key}_week`] = weeklyData.slice(-10).map(item => item[key])//weekLast[key];
            keys[`${key}_month`] = monthlyData.slice(-10).map(item => item[key])//monthLast[key];
            if (
                (!weekLast[key] && weekLast[key] !== 0) || 
                (!monthLast[key] && monthLast[key] !== 0)
            ) {
                hasNull = true;
            }
        })
        if (!hasNull) {
            this.merged.push({
                ...this.root_data[n],
                //timestamp_week: weekLast.timestamp,
                //timestamp_month: monthLast.timestamp,
                ...keys
            })
        }
    }



}


const merge = async (ticker) => {
    const merger = new TimeframeMerger({
        project,
        ticker,
        keys: ['marketcycle', 'rsi'],
        refresh: true
    });
    merger.options.transform = function(data) {
        return merger.monitor.applyTransform(data)
    }
    await merger.merge(`merged/${ticker}.json`)
    return;
}

const main = async() => {
    const tickers = ["AMC","GME","MMM","AOS","ABT","ABBV","ACN","ADBE","AMD","AES","AFL","A","APD","ABNB","AKAM","ALB","ARE","ALGN","ALLE","LNT","ALL","GOOGL","GOOG","MO","AMZN","AMCR","AMTM","AEE","AEP","AXP","AIG","AMT","AWK","AMP","AME","AMGN","APH","ADI","ANSS","AON","APA","AAPL","AMAT","APTV","ACGL","ADM","ANET","AJG","AIZ","T","ATO","ADSK","ADP","AZO","AVB","AVY","AXON","BKR","BALL","BAC","BAX","BDX","BRK.B","BBY","TECH","BIIB","BLK","BX","BK","BA","BKNG","BWA","BSX","BMY","AVGO","BR","BRO","BF.B","BLDR","BG","BXP","CHRW","CDNS","CZR","CPT","CPB","COF","CAH","KMX","CCL","CARR","CTLT","CAT","CBOE","CBRE","CDW","CE","COR","CNC","CNP","CF","CRL","SCHW","CHTR","CVX","CMG","CB","CHD","CI","CINF","CTAS","CSCO","C","CFG","CLX","CME","CMS","KO","CTSH","CL","CMCSA","CAG","COP","ED","STZ","CEG","COO","CPRT","GLW","CPAY","CTVA","CSGP","COST","CTRA","CRWD","CCI","CSX","CMI","CVS","DHR","DRI","DVA","DAY","DECK","DE","DELL","DAL","DVN","DXCM","FANG","DLR","DFS","DG","DLTR","D","DPZ","DOV","DOW","DHI","DTE","DUK","DD","EMN","ETN","EBAY","ECL","EIX","EW","EA","ELV","EMR","ENPH","ETR","EOG","EPAM","EQT","EFX","EQIX","EQR","ERIE","ESS","EL","EG","EVRG","ES","EXC","EXPE","EXPD","EXR","XOM","FFIV","FDS","FICO","FAST","FRT","FDX","FIS","FITB","FSLR","FE","FI","FMC","F","FTNT","FTV","FOXA","FOX","BEN","FCX","GRMN","IT","GE","GEHC","GEV","GEN","GNRC","GD","GIS","GM","GPC","GILD","GPN","GL","GDDY","GS","HAL","HIG","HAS","HCA","DOC","HSIC","HSY","HES","HPE","HLT","HOLX","HD","HON","HRL","HST","HWM","HPQ","HUBB","HUM","HBAN","HII","IBM","IEX","IDXX","ITW","INCY","IR","PODD","INTC","ICE","IFF","IP","IPG","INTU","ISRG","IVZ","INVH","IQV","IRM","JBHT","JBL","JKHY","J","JNJ","JCI","JPM","JNPR","K","KVUE","KDP","KEY","KEYS","KMB","KIM","KMI","KKR","KLAC","KHC","KR","LHX","LH","LRCX","LW","LVS","LDOS","LEN","LLY","LIN","LYV","LKQ","LMT","L","LOW","LULU","LYB","MTB","MPC","MKTX","MAR","MMC","MLM","MAS","MA","MTCH","MKC","MCD","MCK","MDT","MRK","META","MET","MTD","MGM","MCHP","MU","MSFT","MAA","MRNA","MHK","MOH","TAP","MDLZ","MPWR","MNST","MCO","MS","MOS","MSI","MSCI","NDAQ","NTAP","NFLX","NEM","NWSA","NWS","NEE","NKE","NI","NDSN","NSC","NTRS","NOC","NCLH","NRG","NUE","NVDA","NVR","NXPI","ORLY","OXY","ODFL","OMC","ON","OKE","ORCL","OTIS","PCAR","PKG","PLTR","PANW","PARA","PH","PAYX","PAYC","PYPL","PNR","PEP","PFE","PCG","PM","PSX","PNW","PNC","POOL","PPG","PPL","PFG","PG","PGR","PLD","PRU","PEG","PTC","PSA","PHM","QRVO","PWR","QCOM","DGX","RL","RJF","RTX","O","REG","REGN","RF","RSG","RMD","RVTY","ROK","ROL","ROP","ROST","RCL","SPGI","CRM","SBAC","SLB","STX","SRE","NOW","SHW","SPG","SWKS","SJM","SW","SNA","SOLV","SO","LUV","SWK","SBUX","STT","STLD","STE","SYK","SMCI","SYF","SNPS","SYY","TMUS","TROW","TTWO","TPR","TRGP","TGT","TEL","TDY","TFX","TER","TSLA","TXN","TPL","TXT","TMO","TJX","TSCO","TT","TDG","TRV","TRMB","TFC","TYL","TSN","USB","UBER","UDR","ULTA","UNP","UAL","UPS","URI","UNH","UHS","VLO","VTR","VLTO","VRSN","VRSK","VZ","VRTX","VTRS","VICI","V","VST","VMC","WRB","GWW","WAB","WBA","WMT","DIS","WBD","WM","WAT","WEC","WFC","WELL","WST","WDC","WY","WMB","WTW","WYNN","XEL","XYL","YUM","ZBRA","ZBH","ZTS"];
    for (let i=0;i<=tickers.length;i++) {
        await merge(tickers[i])
    }
}
main();
//merge('NVDA');
