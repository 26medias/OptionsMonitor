const Monitor = require('./Monitor');

const main = async () => {
    const monitor = new Monitor("./data/")
    let options = await monitor.getOptions("CELH", 20, 2, 60);
    options.sort((a, b) => {
        return a.price > b.price;
    })
    console.log(options.slice(0, 20))
    cheapest = options[0];
    console.log(`Cheapest option: $${cheapest.pricePerContract}`)
    console.log(cheapest)


    //const data = await monitor.getStockData("INTC");
    //console.log(data);
}

main();