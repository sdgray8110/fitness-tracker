var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var HealthCollection = require('../models/health');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['meta'];
    var viewModel = {
        navigation: Navigation.construct('health')
    };

    HealthCollection.dataAccess.fetch(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('health', viewModel);
    });
});

module.exports = router;