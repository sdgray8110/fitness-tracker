var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var GraphsCollection = require('../models/graphs');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['meta'];

    var viewModel = {
        navigation: Navigation.construct('graphs')
    };

    GraphsCollection.dataAccess.fetch(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('graphs', viewModel);
    });
});

module.exports = router;