var dataHelper = require('./DataHelper');

module.exports = function(app) {
    app.get('/player/:id/', function(req, res) {
        dataHelper.getPlayer(req.params.id, function(data) {
            res.send(data);
        });
    });
};