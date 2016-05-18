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

                db.collection('food').find().sort({food_name: 1}).toArray(function(err, foods) {
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
                model.foodUnits = JSON.stringify(helpers.foodUnits);
                self.dataAccess.getTargets(req, res, function (targets) {
                    model.targets = targets;
                    model.targetsEncoded = JSON.stringify(targets);
                    
                    db.collection('meals').find({meal_date: dateRange}).sort({meal_date: 1}).toArray(function(err, meals) {
                        model.meals = self.processMeals(meals, model.targets);

                        callback(model);
                    });                    
                });
            },

            fetchFoods: function(req, res, callback) {
                var db = req.db;

                db.collection('food').find().sort({food_name: 1}).toArray(function(err, foods) {

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

            },

            editFood: function (req, res, callback) {
                var db = req.db,
                    model = req.body,
                    id = model.food_id;

                delete(model.food_id);

                db.collection('food').update({'_id': new ObjectID(id)}, model, {safe: true}, function(err, result) {
                    db.collection('food').find().sort({food_name: 1}).toArray(function(err, foods) {
                        callback(foods);
                    });
                });

            },

            deleteMeal: function (req, res, callback) {
                var db = req.db,
                    model = req.body,
                    id = model.mealID;

                db.collection('meals').remove({'_id': new ObjectID(id)}, {justOne: true}, function(err, result) {
                    callback(result);
                });                
            },

            getTargets: function (req, res, callback) {
                var db = req.db,
                    model = req.body;

                db.collection('targets').find().toArray(function(err, targets) {
                    callback(targets[0]);
                });
            },

            setTargets: function (req, res, callback) {
                var db = req.db,
                    model = req.body,
                    id;

                db.collection('targets').find().toArray(function(err, targets) {
                    id = targets[0]._id;

                    db.collection('targets').update({'_id': new ObjectID(id)}, model, {safe: true}, function(err, result) {
                        callback(targets[0]);
                    });
                });
            }
        },

        uiModel: function(day, i) {
            day.ui = {
                className: i % 2 === 0 ? 'even' : 'odd'
            };
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

        processMeals: function(meals, targets) {0
            var dailyMeals = {},
                keys = [],
                model = [],
                i = 1;

            meals.forEach(function (meal) {
                meal.meal_date = moment(meal.meal_date).format('MM/DD/YYYY');
                if (typeof(meal.foods) != 'undefined') {
                    meal.foods = JSON.parse(meal.foods);
                } else {
                    meal.foods = {};
                }


                if (typeof(meal.totals) != 'undefined') {
                    meal.totals = JSON.parse(meal.totals);
                } else {
                    meal.totals = {};
                }

                meal.meal_encoded = JSON.stringify(meal);

                if(!dailyMeals[meal.meal_date]) {
                    dailyMeals[meal.meal_date] = {
                        meals: [],
                        totals: {},
                        meal_date: meal.meal_date
                    };
                    i += 1;
                }

                dailyMeals[meal.meal_date].meals.push(meal);
                self.uiModel(dailyMeals[meal.meal_date], i);
            });

            keys = Object.keys(dailyMeals);

            model = keys.map(function(key) {
                dailyMeals[key].totals = self.sumDaily(dailyMeals[key]);
                
                if (dailyMeals[key].totals.food_calories < targets.calorie_target) {
                    dailyMeals[key].calorie_target = targets.calorie_target
                    dailyMeals[key].calorieWarning = true;
                }

                if (dailyMeals[key].totals.food_protein < targets.protein_target) {
                    dailyMeals[key].protein_target = targets.protein_target;
                    dailyMeals[key].proteinWarning = true;
                }

                if (dailyMeals[key].totals.food_sugar > Number(targets.sugar_target)) {
                    dailyMeals[key].sugar_target = targets.sugar_target;
                    dailyMeals[key].sugarWarning = true;
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

        processTabs: helpers.processTabs
    };

    return self;
})();

module.exports = NutritionCollection;