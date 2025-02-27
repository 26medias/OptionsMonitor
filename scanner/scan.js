const Monitor = require('./Monitor');
const ObjectFilter = require('./ObjectFilter');
const { table } = require('table');
const _ = require('underscore');
var Gradient = require('./Gradient');
const argsParser = require('args')

argsParser
.option('refresh', 'refresh the data')
.option('build', 'build the data')
.option('day', 'MarketCycle: day', 40)
.option('week', 'MarketCycle: week', 40)
.option('month', 'MarketCycle: month', 40)
.option('price', 'max option price', 500)
.option('perfect', 'perfect filter')

const args = argsParser.parse(process.argv)

const defaultWatchlist = [
    'BAESY', 'DVN',  'FSLR', 'TXN',  'CRSP',  'NOC',
    'ON',    'TSLA', 'LLY',  'RTX',  'XOM',   'NVO',
    'LMT',   'NEE',  'GD',   'LHX',  'GOOGL', 'VRTX',
    'ABBV',  'ASML', 'JBL',  'SLB',  'REGN',  'EGP',
    'FDX',   'EQIX', 'NVMI', 'J',    'CAMT',  'ROK',
    'ZBRA',  'ISRG', 'DE',   'PWR',  'MSFT',  'CELH',
    'PLTR',  'NVDA', 'AMAT', 'CRWD', 'AVGO',  'AMD',
    'PANW',  'CP',   'CAT',  'AMZN', 'ETN',   'ENB',
    'FLEX',  'URI',  'MRNA', 'SNOW', 'DDOG',  'NUE',
    'META',  'MP',   'CMC',  'ALB',  'INTC',  'ANET'
];

const project = "./data/dr2025/"
const monitor = new Monitor(project);
const gradient = new Gradient();

const MS_HOUR = 1000*60*60;
const MS_DAY = MS_HOUR*24;
const MS_WEEK = MS_DAY*7;

const refresh = args.refresh || false;

let companyInfos = monitor.read("portfolio.json");
if (companyInfos) {
    companyInfos = _.indexBy(companyInfos, "ticker");
}
const tickers = Object.keys(monitor.watchlist.list());
if (tickers.length==0) {
    defaultWatchlist.forEach(item => monitor.watchlist.add(item, "deep-research"))
}

const colorAt = gradient.factory({
    colors: ['#4aa49a', '#4aa49a', '#aaaaaa', '#e26053', '#e26053'], //['#5ccd5d', '#335896', '#dd4838'],
    min: 10,
    max: 90
});
const colorAtNegative = gradient.factory({
    colors: ['#dd4838', '#aaaaaa', '#5ccd5d'], //['#5ccd5d', '#335896', '#dd4838'],
    min: -20,
    max: 20
});

const colorOptionAt = gradient.factory({
    colors: ['#5ccd5d', '#dd4838'],
    min: 250,
    max: 1000
});

const colorValue = (value, diff) => {
    return gradient.terminal(' ', '#ffffff', colorAtNegative(diff)) + ' ' + gradient.terminal(value.toFixed(2), colorAt(value));
}

const scan = async() => {
    let data = monitor.read("scan/scan.json");
    //console.log(data);
    
    const filters = new ObjectFilter();

    data = _.values(data);

    const longTermBuys = filters.create(function(day, week, month, maxPrice) {
        return {
            "day.marketcycle": { "<=": day },
            "week.marketcycle": { "<=": week },
            "month.marketcycle": { "<=": month },
            "option.pricePerContract": { "<=": maxPrice }
        };
    });

    const perfect = filters.create(function(day, week, month, maxPrice) {
        return {
            "day.marketcycle": { "<=": day },
            "day_diff.marketcycle": { ">": 0 },
            "week.marketcycle": { "<=": week },
            "week_diff.marketcycle": { ">": 0 },
            "month_prev.marketcycle": { "<=": month },
            "month_diff.marketcycle": { ">": 0 },
            "option.pricePerContract": { "<=": maxPrice }
        };
    });

    const filteredData1 = (args.perfect ? perfect : longTermBuys)(data, [args.day, args.week, args.month, args.price]); // [day, week, month, maxPrice]

    console.log("\n\n\n")
    console.log(filteredData1.map(item => {
        return [
            companyInfos && companyInfos[item.ticker] ? table([
                ["Ticker", companyInfos[item.ticker].ticker],
                ["Name", companyInfos[item.ticker].name],
                ["Sector", companyInfos[item.ticker].sector],
                ["Rationale", companyInfos[item.ticker].rationale],
                ["Weight", companyInfos[item.ticker].weight+'%'],
                ["Description", companyInfos[item.ticker].company_description],
            ]): `                ===[ ${item.ticker} ]===\n`,
            table([
                ["", "DAY", "WEEK", "MONTH"],
                ["Price", item.day.close, item.week.close, item.month.close],
                ["MarketCycle", colorValue(item.day.marketcycle, item.day_diff.marketcycle), colorValue(item.week.marketcycle, item.week_diff.marketcycle), colorValue(item.month.marketcycle, item.month_diff.marketcycle)],
                ["RSI", colorValue(item.day.rsi, item.day_diff.rsi), colorValue(item.week.rsi, item.week_diff.rsi), colorValue(item.month.rsi, item.month_diff.rsi)],
            ]),
            table([
                ["Option Price", gradient.terminal('$'+item.option.pricePerContract, "#000000", colorOptionAt(item.option.pricePerContract))],
                ["Strike", '$'+item.option.strike.toFixed(2)],
                ["Percent above strike", item.option.percentAboveStrike+'%'],
                ["Expires in", item.option.expireIn],
            ]),
            item.reddit? table([
                ["Rank", item.reddit.rank, item.reddit.rank-item.reddit.rank_24h_ago],
                ["Mentions", item.reddit.mentions, item.reddit.mentions-item.reddit.mentions_24h_ago],
                ["Upvotes", item.reddit.upvotes, ""],
            ]): '',
            item.news? table([
                ["News", item.news.length],
            ]): '',
            "\n"
        ].join('\n')
    }).join('\n'))
    console.log(`\n${filteredData1.length} results`)
}

const main = async() => {
    if (args.refresh || args.build) {
        //await build();
        await monitor.buildStockData(tickers, refresh)
        console.log("buildStockData Done")
    }
    await scan();
    console.log("scan Done")
}
main();
