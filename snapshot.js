const Monitor = require('./Monitor');
const fs = require('fs');
const { table } = require('table');
const argsParser = require('args')

argsParser
.option('refresh', 'refresh the data')
.option('ticker', 'ticker')

const args = argsParser.parse(process.argv)

const data_dir = "./data/snapshot"

const monitor = new Monitor(data_dir)

const assembleData = (data) => {
    let {
        ticker,
        indicators,
        reddit,
        news,
        options,
    } = data;

    options.sort((a, b) => {
        return a.price > b.price;
    })
    
    const date = indicators[indicators.length-1].timestamp;
    const last = indicators[indicators.length-1];

    let rows = [];
    rows.push([
        '',
        '',
        '24h',
        'week',
        'month'
    ]);

    rows.push([
        "Ticker",
        ticker,
        '',
        '',
        ''
    ]);
    rows.push([
        "Updated",
        date,
        '',
        '',
        ''
    ]);
    rows.push([
        "Price",
        "$"+last.close,
        '',
        '',
        ''
    ]);
    rows.push([
        "RSI",
        last.rsi.toFixed(2),
        '',
        '',
        ''
    ]);
    rows.push([
        "MarketCycle",
        last.marketcycle.toFixed(2),
        '',
        '',
        ''
    ]);

    rows.push([
        "Rank",
        reddit.rank,
        reddit.rank_24h_ago,
        '',
        ''
    ]);

    rows.push([
        "Mentions",
        reddit.mentions,
        reddit.mentions_24h_ago,
        '',
        ''
    ]);

    rows.push([
        "Upvotes",
        reddit.upvotes,
        '',
        '',
        ''
    ]);

    let cheapest = options[0];

    rows.push([
        "Cheapest Option",
        `$${cheapest.pricePerContract} - ${cheapest.expireIn} - ${cheapest.percentAboveStrike}%`,
        '',
        '',
        ''
    ]);

    const newsGroup = news.map(item => {
        const date = new Date(item.published_utc).toLocaleDateString();
        const time = new Date(item.published_utc).toLocaleTimeString();
        const insights = item.insights.find(insight => insight.ticker == ticker)
        return [
            `[${date} ${time}]`,
            `Description: ${item.description}.\n${insights.sentiment_reasoning}`,
            `Sentiment: ${insights.sentiment}`,
        ].join('\n')
    }).join('\n\n');

    rows.push([
        "News",
        news.length,
        '',
        '',
        ''
    ]);


    console.log("\n\n\n-----------------------------\n\n\n")
    console.log(newsGroup);
    console.log(table(rows))
}

const main = async (ticker, refresh=true) => {

    let data = null;
    const filename = `snapshot/${ticker}.json`
    if (!fs.existsSync(data_dir+'/'+filename) || refresh) {
        console.log("Refreshing...")
        let indicators = await monitor.getAugmentedStockData(ticker, true);
        let reddit = await monitor.getRedditStats(ticker, true);
        let news = await monitor.getNews(ticker, 5);
    
        let options = await monitor.getOptions(ticker, 20, 2, 60, true);
    
        data = {
            ticker,
            indicators,
            reddit,
            news,
            options,
            refreshed: new Date()
        }
    
    
        monitor.write(filename, data);
    } else {
        console.log("Loading from cache...")
        data = monitor.read(`snapshot/${ticker}.json`)
    }
    
    assembleData(data);

    
    /*let options = await monitor.getOptions(ticker, 20, 2, 60);
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

main(args.ticker, args.refresh);