var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var HealthCollection = require('../models/health');
var SettingsCollection = require('../models/settings');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    var viewModel = {
        navigation: Navigation.construct('health')
    };
    SettingsCollection.dataAccess.fetchSettings(req, res, function(settings) {
        viewModel = helpers.extend(viewModel, settings);
        HealthCollection.dataAccess.fetch(req, res, function (partialModel) {
            viewModel = helpers.extend(viewModel, partialModel);

            res.render('health', viewModel);
        });
    });
});

router.get('/:year(\\d+)/:month(\\d+)', function(req, res) {
    req.title = 'Fitness Tracker';
    var viewModel = {
        navigation: Navigation.construct('health')
    };

    SettingsCollection.dataAccess.fetchSettings(req, res, function(settings) {
        viewModel = helpers.extend(viewModel, settings);
        HealthCollection.dataAccess.fetch(req, res, function(partialModel) {
            viewModel = helpers.extend(viewModel, partialModel);

            res.render('health', viewModel);
        });
    });
});

module.exports = router;