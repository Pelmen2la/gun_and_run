var fs = require('fs'),
    path = require('path'),
    MobileDetect = require('mobile-detect');

module.exports = function(app) {
    app.get('/', function(req, res) {
        fs.readFile(path.join(global.appRoot, '/static/html/app.html'), 'utf8', function(err, indexPageHtml) {
            var isMobile = (new MobileDetect(req.headers['user-agent'])).mobile();
            indexPageHtml = indexPageHtml.replace('{{IS_MOBILE_CLASS}}', isMobile ? 'mobile' : '');
            res.send(indexPageHtml);
        });
    });
};