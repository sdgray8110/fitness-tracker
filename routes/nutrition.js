var express = require('express');
var router = express.Router();
var helpers = require('../helpers');
var NutritionCollection = require('../models/nutrition');
var Navigation = require('../models/navigation');

router.get('/', function(req, res) {
    req.title = 'Fitness Tracker';
    req.fields = ['meta'];
    var viewModel = {
        navigation: Navigation.construct('nutrition')
    };

    NutritionCollection.dataAccess.fetch(req, res, function(partialModel) {
        viewModel = helpers.extend(viewModel, partialModel);

        res.render('nutrition', viewModel);
    });
});

module.exports = router;