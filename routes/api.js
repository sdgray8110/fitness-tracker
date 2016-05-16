var express = require('express');
var router = express.Router();
var Config = require('../models/config');
var RideCollection = require('../models/rides');
var ActivityCollection = require('../models/activity');
var NutritionCollection = require('../models/nutrition');
var RideGraphs = require('../models/graphs');
var moment = require('moment');

/* GET */
router.get('/rides', function(req, res) {
    var db = req.db;

    db.collection('rides').find().sort({date: -1}).limit(50).toArray(function(err, rides) {
        res.json(RideCollection.processCollection(rides));
    });
});

router.get('/ride/:id', function(req, res) {
    RideCollection.dataAccess.fetchRideByID(req, res, function(rides) {
        res.json(rides);
    });
});

router.get('/rides/:year(\\d+)/:month(\\d+)', function(req, res) {
    req.fields = ['rides'];

    RideCollection.dataAccess.fetchMonth(req, res, function(rides) {
        res.json(rides);
    });
});


router.get('/activity/:id', function(req, res) {
    ActivityCollection.dataAccess.fetchActivityByID(req, res, function(activity) {
        res.json(activity);
    });
});

router.get('/stats/:year(\\d+)', function(req, res) {
    req.fields = ['stats'];

    RideCollection.dataAccess.fetchYear(req, res, function(stats) {
        res.json(stats);
    });
});


router.get('/stats/:year(\\d+)/:month(\\d+)', function(req, res) {
    req.fields = ['stats'];

    RideCollection.dataAccess.fetchMonth(req, res, function(stats) {
        res.json(stats);
    });
});

router.get('/common-rides', function(req, res) {
    RideCollection.dataAccess.fetchCommonRides(req, res, function(commonRides) {
        res.json(commonRides);
    });
});

router.get('/form-config', function(req, res) {
    Config.dataAccess.formConfig(function(config) {
        res.json(config);
    });
});

router.get('/migrate', function(req, res) {
    var db = req.db,
        ct = 0;

    db.collection('rides').find().toArray(function(err, rides) {
        rides.forEach(function(ride) {
            var isoDate = moment(ride.date).toDate();

            db.collection('rides').update({_id: ride._id}, {'$set':{date: isoDate}}, function(err, result) {
                if (err) {
                    throw err;
                }

                if (result) {
                    ct += 1;
                    console.log('Updated');
                }
            });
        });

        res.send('<p>' + ct + ' items updated successfully!</p>');
    });
});

router.get('/years', function(req, res) {
    RideCollection.dataAccess.fetchYearList(req, res, {}, function(years) {
        res.json(years);
    });
});

router.get('/years/:year(\\d+)', function(req, res) {
    var year = parseInt(req.params.year);

    RideCollection.dataAccess.fetchYearList(req, res, {selectedYear: year}, function(years) {
        res.json(years);
    });
});

/* GRAPHING */

router.get('/graph/monthly-totals', function(req, res) {
    RideGraphs.dataAccess.monthlyTotals(req, res, function(totals) {
        res.json(totals);
    });
});

/* POST */

router.post('/new', function(req, res) {
    RideCollection.dataAccess.postNewRide(req, res, function(ride) {
        res.json(ride);
    });
});

router.post('/update', function(req, res) {
    RideCollection.dataAccess.updateRide(req, res, function(ride) {
        res.json(ride);
    });
});

router.post('/delete', function(req, res) {
    RideCollection.dataAccess.deleteRide(req, res, function(message) {
        res.json(message);
    });
});

router.post('/activity/new', function(req, res) {
    ActivityCollection.dataAccess.postNewActivity(req, res, function(activity) {
        res.json(activity);
    });
});

router.post('/activity/update', function(req, res) {
    ActivityCollection.dataAccess.updateActivity(req, res, function(activity) {
        res.json(activity);
    });
});

router.get('/foods', function(req, res) {
    NutritionCollection.dataAccess.fetchFoods(req, res, function(message) {
        res.json(message);
    });
});

router.post('/food/new', function(req, res) {
    NutritionCollection.dataAccess.postNewFood(req, res, function(message) {
        res.json(message);
    });
});

router.post('/meal/new', function(req, res) {
    NutritionCollection.dataAccess.postNewMeal(req, res, function(message) {
        res.json(message);
    });
});

router.get('/meal/deleteall', function(req, res) {
    NutritionCollection.dataAccess.clearMeals(req, res, function(message) {
        res.json(message);
    });
});

router.get('/food/deleteall', function(req, res) {
    NutritionCollection.dataAccess.clearFoods(req, res, function(message) {
        res.json(message);
    });
});

router.post('/meal/edit', function(req, res) {
    NutritionCollection.dataAccess.editMeal(req, res, function(message) {
        res.json(message);
    });
});

router.post('/meal/delete', function(req, res) {
    NutritionCollection.dataAccess.deleteMeal(req, res, function(message) {
        res.json(message);
    });
});

router.post('/food/edit', function(req, res) {
    NutritionCollection.dataAccess.editFood(req, res, function(message) {
        res.json(message);
    });
});

router.post('/targets', function(req, res) {
    NutritionCollection.dataAccess.setTargets(req, res, function(message) {
        res.json(message);
    });
});

module.exports = router;
