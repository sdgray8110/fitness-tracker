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

                self.dataAccess.selectCommonMeals(req, res, function (common) {
                    model.commonMeals = JSON.stringify(common);

                    db.collection('food').find().sort({food_name: 1}).toArray(function(err, foods) {
                        foodlist = JSON.stringify(foods);

                        req.fields.forEach(function(field) {
                            var association = fieldAssociation(field);

                            model[field] = self[association.method](association.data);
                        });

                        self.dataAccess.monthlyMealOverview(req, res, dateRange, callback);
                    });
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

            deleteFood: function (req, res, callback) {
                var db = req.db,
                    food = req.body,
                    id = food.food_id;

                db.collection('food').remove({'_id': new ObjectID(id)}, {justOne: true}, function(err, result) {
                    food.message = 'Food ' + id + ' successfully removed';

                    callback(food);
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
            },

            selectCommonMeals: function (req, res, callback) {
                var db = req.db,
                    ids = {},
                    foods = [],
                    observed = [],
                    threshold = 2,
                    common = [];


                db.collection('meals').find().sort({meal_date: 1}).toArray(function(err, meals) {
                    var theMeals = [];

                    meals.forEach(function(meal, i) {
                        var items = JSON.parse(meal.foods);
                        theMeal = meal;
                        items = items.sort(self.sortByCalories);

                        ids = items.map(function (item) {
                            return item._id;
                        });

                        foods.push({ids: ids.toString(), meal_index: i});
                        meal.foods = items;
                    });

                    foods.forEach(function(id) {
                        ids[id.ids] = ids[id.ids] ? ids[id.ids] + 1 : 1;

                        if (ids[id.ids] >= threshold && observed.indexOf(ids) <= 0 && (meals[id.meal_index].foods.length >= 2)) {
                            observed.push(id.ids);
                            common.push(meals[id.meal_index]);
                        }
                    });

                    callback(self.processRecipes(common));
                });
            },

            backup: function (req, res, callback) {
                var db = req.db,
                    backup = require('../data/meals.json.js');

                backup.forEach(function(meal) {
                    db.collection('meals').insert(meal, function(err, result) {
                        var newFood = result.ops[0];

                    });
                });

                    callback(backup);

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

        processRecipes: function(recipes) {
            var updated = [],
                names = [],
                theRecipe;

            recipes.forEach(function (recipe) {
                theRecipe = self.processRecipe(recipe);

                if (names.indexOf(theRecipe.name) < 0) {
                    updated.push(theRecipe);
                    names.push(theRecipe.name);
                }
            });

            updated = updated.sort(self.sortByName);
            updated.forEach(function(item, i) {
                item.index = i;
            });

            return updated;
        },

        processRecipe: function (recipe) {
            return {
                    name: self.recipeName(recipe),
                    foods: recipe
                };
        },

        sortByCalories: function (a, b) {
            if ((a.food_calories * a.food_serving_size) < (b.food_calories * b.food_serving_size)) {
                return 1;
            }

            if ((a.food_calories * a.food_serving_size) > (b.food_calories * b.food_serving_size)) {
                return -1;
            }

            return 0;
        },

        sortByName: function (a, b) {
            if (a.name > b.name) {
                return 1;
            }

            if (a.name < b.name) {
                return -1;
            }

            return 0;
        },

        recipeName: function (recipe) {
            var name = [];

            recipe.foods.forEach(function (item) {
                name.push(item.food_name.trim());
            });

            return self.delimitName(name);
        },

        delimitName: function (arr) {
            var outStr = "";
            if (arr.length === 1) {
                outStr = arr[0];
            } else if (arr.length === 2) {
                //joins all with "and" but no commas
                //example: "bob and sam"
                outStr = arr.join(' and ');
            } else if (arr.length > 2) {
                //joins all with commas, but last one gets ", and" (oxford comma!)
                //example: "bob, joe, and sam"
                outStr = arr.slice(0, -1).join(', ') + ', and ' + arr.slice(-1);
            }
            return outStr;
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

                var duplicate = helpers.extend({}, meal);;
                duplicate.meal_date = moment().format('MM/DD/YYYY');
                duplicate.selectedFoods = duplicate.foods;
                duplicate.inProgress = true;
                duplicate.selectedFoodTotals = duplicate.totals;

                delete(duplicate._id);
                delete(duplicate.totals);

                meal.meal_encoded = JSON.stringify(meal);
                meal.duplicate = JSON.stringify(duplicate);

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

                if ((dailyMeals[key].totals.food_fiber / ((dailyMeals[key].totals.food_calories / 1000))) < Number(targets.fiber_target)) {
                    dailyMeals[key].fiber_target = targets.fiber_target;
                    dailyMeals[key].fiberWarning = true;
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