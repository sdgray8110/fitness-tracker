var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var SettingsCollection = require('../models/settings');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    var viewModel = {
        navigation: Navigation.construct('settings')
    };

    SettingsCollection.dataAccess.get(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('settings', viewModel);
    });
});

module.exports = router;