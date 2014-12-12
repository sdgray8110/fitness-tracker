var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var ActivityCollection = require('../models/activity');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['activities', 'meta', 'content'];
    var viewModel = {
        navigation: Navigation.construct('activity')
    };

    ActivityCollection.dataAccess.fetchMonth(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('activity', viewModel);
    });
});

module.exports = router;