const Monitor = require('./Monitor');
const { table } = require('table');

const project = "./data/dr2025/"
const monitor = new Monitor(project);

monitor.scanOptions(5/*% from strike*/, 1/*%/day*/, 160/*min days away*/, function(output) {
    console.log(output);
    monitor.write("scan.json", output)
})
