var fs = require('fs'),
    path = require('path'),
    MobileDetect = require('mobile-detect'),
    dataHelper = require('./../DataHelper'),
    socket = require('./../Socket');

module.exports = function(app) {
    app.get('/', function(req, res) {
        fs.readFile(path.join(global.appRoot, '/static/html/app.html'), 'utf8', function(err, indexPageHtml) {
            var isMobile = (new MobileDetect(req.headers['user-agent'])).mobile();
            indexPageHtml = indexPageHtml.replace('{{IS_MOBILE_CLASS}}', isMobile ? 'mobile' : '');
            indexPageHtml = indexPageHtml.replace('{{GAME_LANDSCAPE_PROPERTIES}}', JSON.stringify(global.landscapeProperties));
            indexPageHtml = indexPageHtml.replace('{{GAME_CHARACTER_NAMES}}', JSON.stringify(global.characterNames));
            res.send(indexPageHtml);
        });
    });

    app.get('/player/:id/', function(req, res) {
        dataHelper.getPlayer(req.params.id, function(data) {
            res.send(data);
        });
    });

    app.get('/debug/', function(req, res) {
        fs.readFile(path.join(global.appRoot, '/static/html/debug.html'), 'utf8', function(err, debugPageHtml) {
            debugPageHtml = debugPageHtml.replace('{{ROOMS_DATA}}', JSON.stringify(socket.getRooms()));
            res.send(debugPageHtml);
        });
    });
};