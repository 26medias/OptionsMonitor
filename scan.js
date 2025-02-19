const Monitor = require('./Monitor');
const table = require('table');
var progressbar 	= require('progress');

const watchlist = [
    "NVDA",
    "AMD",
    "ARM",
    "INTC",
    "AVGO",
    "DELL",
    "META",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NBIS",
    "TXN",
    "PLTR",
    "RXRX",
    "GRRR",
    "RKLB",
    "ASTS",
    "LUNR",
    "NVO",
    "HIMS",
    "V",
    "RDDT",
    "MSTR",
    "APLD",
    "RIVN",
    "TEM",
    "GRAB",
    "SOFI",
    "SOBR"
];

const main = async () => {
    const monitor = new Monitor("./data/");
    const bar = new progressbar('SCANNING [:bar] :percent [:current/:total] :etas', {
        complete: 	'=',
        incomplete:	' ',
        width: 		20,
        total: 		watchlist.length
    });

    const output = [];

    for (const ticker of watchlist) {
        try {
            let options = await monitor.getOptions(ticker, 20, 2, 160);
            
            if (options.length === 0) {
                console.log(`=== ${ticker} ===`);
                console.log("No options available.");
                console.log("");
                continue;
            }

            let cheapest = options[0];
            
            const text = []
            text.push(`=== ${ticker} ===`);
            text.push(`Close: $${cheapest.currentClose}`);
            text.push(`Cheapest option: $${cheapest.pricePerContract}`);
            text.push(`Expires: ${cheapest.expireIn}`);
            text.push(`Percents: ${cheapest.percentAboveStrike}`);
            text.push("");
            console.log(text.join("\n"))

            output.push(cheapest);
            bar.tick();
            
        } catch (error) {
            console.error(`Error fetching options for ${ticker}:`, error.message);
        }
    }

    console.log(output);
    monitor.write("scan.json", output)
};

main();
