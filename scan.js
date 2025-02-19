const Monitor = require('./Monitor');

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

    for (const ticker of watchlist) {
        try {
            let options = await monitor.getOptions(ticker, 20, 160);
            
            if (options.length === 0) {
                console.log(`=== ${ticker} ===`);
                console.log("No options available.");
                console.log("");
                continue;
            }

            let cheapest = options[0];
            console.log(`=== ${ticker} ===`);
            console.log(`Close: $${cheapest.currentClose}`);
            console.log(`Cheapest option: $${cheapest.pricePerContract}`);
            console.log(`Expires: ${cheapest.expireIn}`);
            console.log(`Percents: ${cheapest.percentAboveStrike}`);
            console.log(cheapest);
            console.log("");
        } catch (error) {
            console.error(`Error fetching options for ${ticker}:`, error.message);
        }
    }
};

main();
