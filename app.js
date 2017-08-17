var express = require('express'),
    compression = require('compression'),
    path = require('path'),
    app = express();

global.appRoot = path.resolve(__dirname);

app.use(compression());

var server = app.listen(process.env.PORT || 3103, 'localhost', function () {
    console.log('App listening on port ' + server.address().port);
});

require('./server/config/index')(app);
require('./server/routes/index')(app);
require('./server/Socket').init();

process.on('uncaughtException', function(err) {
    console.error(err);
});
