var dateFormat = require('dateformat'),
    path = require('path'),
    fs = require('fs');

module.exports = function (app) {
    require('./express')(app);
    require('./mongoose')(app);
};

process.on('uncaughtException', function(err) {
    console.error(err);
    var errorText = dateFormat(new Date()) + ' ' + err.stack + '\n\n';
    fs.appendFile(path.join(global.appRoot, 'errors.txt'), errorText, function(err) {
    });
});