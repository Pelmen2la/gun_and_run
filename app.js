var http = require('http'),
    express = require('express'),
    compression = require('compression'),
    path = require('path'),
    app = express();

global.appRoot = path.resolve(__dirname);

app.use(compression());

const server = http.createServer(app);

server.listen(process.env.PORT || 3103, process.env.HOST || 'localhost', function () {
    console.log(`App listening on ${this.address().address}:${this.address().port}`);
});

require('./server/config/index')(app);
require('./server/routes/index')(app);
require('./server/Socket').init(server);

process.on('uncaughtException', function(err) {
    console.error(err);
});
