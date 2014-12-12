var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var RideCollection = require('../models/rides');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['stats'];
    var viewModel = {
        navigation: Navigation.construct('ride'),
        homepage: true
    };

    RideCollection.dataAccess.fetchYear(req, res, function(partialModel) {
        req.fields = ['rides', 'stats', 'tabs', 'meta', 'content'];
        viewModel = helpers.extend(viewModel, partialModel);

        RideCollection.dataAccess.fetchMonth(req, res, function(partialModel) {
            viewModel = helpers.extend(viewModel, partialModel);

            res.render('index', viewModel);
        });
    });
});

router.get('/:year(\\d+)/:month(\\d+)', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['stats'];
    var viewModel = {
            navigation: Navigation.construct('ride')
        },
        isFutureDate = helpers.isFutureDate(req);

    if (isFutureDate) {
        res.redirect(isFutureDate);
    } else {
        RideCollection.dataAccess.fetchYear(req, res, function(partialModel) {
            req.fields = ['rides', 'stats', 'tabs', 'meta', 'content'];
            viewModel = helpers.extend(viewModel, partialModel);

            RideCollection.dataAccess.fetchMonth(req, res, function(partialModel) {
                viewModel = helpers.extend(viewModel, partialModel);

                res.render('index', viewModel);
            });
        });
    }
});

router.get('/graphs', function(req, res) {
    req.title = 'Fitness Tracker';
    var viewModel = {
            navigation: Navigation.construct('ride')
        };

    res.render('graphs', viewModel);
});


module.exports = router;