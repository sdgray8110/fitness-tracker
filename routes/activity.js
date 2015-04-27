var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var ActivityCollection = require('../models/activity');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['activities', 'meta', 'content', 'tabs'];
    var viewModel = {
        navigation: Navigation.construct('activity')
    };

    ActivityCollection.dataAccess.fetchMonth(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('activity', viewModel);
    });
});

router.get('/:year(\\d+)/:month(\\d+)', function(req, res) {
    var isFutureDate = helpers.isFutureDate(req, 'activity');

    if (isFutureDate) {
        res.redirect(isFutureDate);
    } else {
        req.title = 'Fitness Tracker';
        req.fields = ['activities', 'meta', 'content', 'tabs'];
        var viewModel = {
            navigation: Navigation.construct('activity')
        };

        ActivityCollection.dataAccess.fetchMonth(req, res, function(partialModel) {
            viewModel = helpers.extend(viewModel, partialModel);

            res.render('activity', viewModel);
        });
    }
});

module.exports = router;