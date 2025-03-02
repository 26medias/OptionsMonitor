const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ObjectFilter = require('./ObjectFilter');
const GcfHandler = require('./GcfHandler');
const app = express();
const port = 3000


app.use(bodyParser.json({limit: '50mb'}))
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
app.use(cors());

var handler = new GcfHandler(app);

// Refresh the scan data
handler.on('/scanner/refresh', function(params, callback, req, res, core) {
    core.scanner.refresh(params, callback);
});

// Filter the scan data to get a subset
handler.on('/scanner/filter', function(params, callback, req, res, core) {
    core.scanner.filter(params, callback);
});

// Charts
handler.on('/charts/charts', function(params, callback, req, res, core) {
    core.charts.charts(params, callback);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})