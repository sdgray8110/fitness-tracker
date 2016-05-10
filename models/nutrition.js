var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID;

var NutritionCollection = (function() {
    var self = {
        processMeta: function(data) {
            return {title: data.title + ' | ' + 'Nutrition'}
        },

        dataAccess: {
            fetchMonth: function(req, res, callback) {
                var db = req.db,
                    dateStr = helpers.constructDateString(req),
                    dateObj = moment(dateStr),
                    selectedYear = dateObj.format('YYYY'),
                    selectedMonth = dateObj.format('MM'),
                    displayMonth = dateObj.format('MMMM YYYY'),
                    dateRange = {'$gte': moment(dateStr).startOf('month').toDate(), '$lt': moment(dateStr).endOf('month').toDate()},
                    content = {displayMonth: displayMonth, dateString: dateStr},
                    foodlist = [];
                    fieldAssociation = function(field) {
                        var associations = {
                                meta: {method: 'processMeta', data: {title: req.title, displayMonth: displayMonth}},
                                content: {method: 'processContent', data: content},
                                tabs: {method: 'processTabs', data: dateObj},
                                foods: {method: 'processFoods', data: foodlist}
                            };

                        return associations[field];
                    },
                    model = {};

                db.collection('food').find().toArray(function(err, foods) {
                    foodlist = JSON.stringify(foods);

                    req.fields.forEach(function(field) {
                        var association = fieldAssociation(field);

                        model[field] = self[association.method](association.data);
                    });

                    self.dataAccess.monthlyMealOverview(req, res, dateRange, callback);
                    
                });
            },

            monthlyMealOverview: function(req, res, dateRange, callback) {
                var db = req.db;

                model.meals = {};

                db.collection('meals').find({meal_date: dateRange}).sort({meal_date: 1}).toArray(function(err, meals) {
                    model.meals = self.processMeals(meals);

                    console.log(meals);

                    callback(model);
                });
            },

            fetchFoods: function(req, res, callback) {
                var db = req.db;

                db.collection('food').find().toArray(function(err, foods) {

                    callback(foods);
                });
            },

            /* POST */
            postNewFood: function(req, res, callback) {
                var db = req.db,
                    food = req.body;

                db.collection('food').insert(food, function(err, result) {
                    var newFood = result.ops[0];

                    db.collection('food').find().toArray(function(err, foods) {
                        callback(foods);
                    });
                });
            },

            postNewMeal: function(req, res, callback) {
                var db = req.db,
                    meal = req.body;

                meal.meal_date = moment(meal.meal_date).toDate();

                db.collection('meals').insert(meal, function(err, result) {
                    var newFood = result.ops[0];

                    db.collection('meals').find().toArray(function(err, foods) {
                        callback(foods);
                    });
                });
            },

            clearMeals: function(req, res, callback) {
                var db = req.db;

                db.collection('meals').remove();

                db.collection('meals').find().toArray(function(err, foods) {
                    callback(foods);
                });
            },

            clearFoods: function(req, res, callback) {
                var db = req.db;

                db.collection('food').remove();

                db.collection('food').find().toArray(function(err, foods) {
                    callback(foods);
                });
            },

            editMeal: function (req, res, callback) {
                var db = req.db,
                    model = req.body,
                    id = model.mealID;

                model.meal_date = moment(model.meal_date).toDate();

                db.collection('meals').update({'_id': new ObjectID(id)}, model, {safe: true}, function(err, result) {
                    db.collection('meals').find().toArray(function(err, foods) {
                        callback(foods);
                    });
                });

            }
        },

        processMeta: function(req) {
            return {title: req.title + ' | Nutrition' }
        },

        processContent: function(data) {
            return data;
        },

        processFoods: function(data) {
            return data;
        },

        processMeals: function(meals) {
            var dailyMeals = {},
                keys = [],
                model = [];

            meals.forEach(function (meal) {
                meal.meal_date = moment(meal.meal_date).format('MM/DD/YYYY');
                meal.foods = JSON.parse(meal.foods);
                meal.totals = JSON.parse(meal.totals);
                meal.meal_encoded = JSON.stringify(meal);

                if(!dailyMeals[meal.meal_date]) {
                    dailyMeals[meal.meal_date] = {
                        meals: [],
                        totals: {},
                        meal_date: meal.meal_date

                    };
                }

                dailyMeals[meal.meal_date].meals.push(meal);
            });

            keys = Object.keys(dailyMeals);

            model = keys.map(function(key) {
                dailyMeals[key].totals = self.sumDaily(dailyMeals[key]);
                
                if (dailyMeals[key].totals.food_calories < 2000) {
                    dailyMeals[key].calorieWarning = true;
                }

                if (dailyMeals[key].totals.food_protein < 100) {
                    dailyMeals[key].proteinWarning = true;
                }

                return dailyMeals[key];
            });

            return model;
        },
        
        sumDaily: function(day) {
            var totals = {},
                keys = Object.keys(day.meals[0].totals);

            keys.forEach(function(key) {
                totals[key] = self.foodSum(day, key);
            });

            return totals;
        },

        foodSum: function (day, key) {
            var value = 0;

            day.meals.forEach(function (meal) {
                value = value || 0;

                value = meal.totals[key] + value;
            });

            return value;
        },

        processTabs: function(date) {
            var now = moment(),
                selectedMonth = parseInt(date.format('M')),
                currentMonth = date.year() === now.year() ? parseInt(moment().format('M')) : 12,
                year = parseInt(date.format('YYYY')),
                month = currentMonth,
                months = [];

            while (month > 0) {
                var model = {
                    month: month,
                    year: year,
                    name: helpers.monthName(month),
                    className: month === selectedMonth ? 'active' : null
                };

                months.push(model);

                month -= 1;
            };

            return months.reverse();
        },
    };

    return self;
})();

module.exports = NutritionCollection;