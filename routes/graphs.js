var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var GraphsCollection = require('../models/graphs');
var SettingsCollection = require('../models/settings');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['meta'];

    var viewModel = {
        navigation: Navigation.construct('graphs')
    };

    SettingsCollection.dataAccess.fetchSettings(req, res, function(settings) {
        viewModel = helpers.extend(viewModel, settings);
        GraphsCollection.dataAccess.fetch(req, res, function(partialModel) {
            viewModel = helpers.extend(viewModel, partialModel);

            res.render('graphs', viewModel);
        });
    });
});

module.exports = router;