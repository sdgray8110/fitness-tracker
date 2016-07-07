var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID;

var NutritionCollection = (function() {
    var self = {
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
                    foodlist = [],
                    fieldAssociation = function(field) {
                        var associations = {
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

                        self.dataAccess.monthlyMealOverview(req, res, dateRange, model, callback);
                    });
                });
            },

            monthlyMealOverview: function(req, res, dateRange, model, callback) {
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
                    self.dataAccess.getRequiredFoods(req, res, function(requiredFoods) {
                        self.processRequiredFoods(requiredFoods, targets[0]);
                        targets[0].requiredFoods = requiredFoods;

                        callback(targets[0]);
                    });
                });
            },

            getRequiredFoods: function  (req, res, callback) {
                var db = req.db;

                db.collection('food').find({food_required: '1'}).toArray(function(err, requiredFoods) {
                    callback(requiredFoods);
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

        processFoods: function(foods) {
            foods = JSON.parse(foods);

            foods.forEach(function (food) {
               if (food.food_required) {
                   food.food_required_checked = true;
               }
            });

            return JSON.stringify(foods);
        },

        processRecipes: function(recipes) {
            var updated = [],
                names = [],
                theRecipe,
                sortByName = helpers.sortByProp('name');

            recipes.forEach(function (recipe) {
                theRecipe = self.processRecipe(recipe);

                if (names.indexOf(theRecipe.name) < 0) {
                    updated.push(theRecipe);
                    names.push(theRecipe.name);
                }
            });

            updated = updated.sort(sortByName);
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

        processRequiredFoods: function (foods, targets) {
            var keys = Object.keys(targets),
                id;

            keys.forEach(function (key) {
                if (key.match('required_food_')) {
                    id = key.replace('required_food_', '');

                    foods.forEach(function (food) {
                        if (food._id == id) {
                            food.count = targets[key];
                        }
                    });
                }
            });
        },

        sortByCalories: function (a, b) {
            if ((Number(a.food_calories) * Number(a.count)) < (Number(b.food_calories) * Number(b.count))) {

                return 1;
            }

            if ((Number(a.food_calories) * Number(a.count)) > (Number(b.food_calories) * Number(b.count))) {

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
        
        processMeals: function(meals, targets) {
            var dailyMeals = {},
                keys = [],
                model = [],
                i = 1,
                targetsPipeline = ['set_calorie_target', 'set_protein_target', 'set_sugar_target', 'set_fiber_target', 'required_foods_warning'];


            meals.forEach(function (meal) {
                i = self.processDailyMeal(meal, dailyMeals, i);
            });

            keys = Object.keys(dailyMeals);

            model = keys.map(function(key) {
                dailyMeals[key].totals = self.sumDaily(dailyMeals[key]);

                targetsPipeline.forEach(function (func) {
                    self[func](dailyMeals[key], targets);
                });

                return dailyMeals[key];
            });

            return model;
        },


        processDailyMeal: function (meal, dailyMeals, i) {
            meal.meal_date = moment(meal.meal_date).format('MM/DD/YYYY');
            if (typeof(meal.foods) != 'undefined') {
                meal.foods = JSON.parse(meal.foods);
            } else {
                meal.foods = {};
            }


            if (typeof(meal.totals) != 'undefined') {
                meal.totals = JSON.parse(meal.totals);
                meal.totals.display = helpers.formatTotaledDecimals(meal.totals,Object.keys(meal.totals));
            } else {
                meal.totals = {};
            }

            var duplicate = helpers.extend({}, meal);
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

            return i;
        },

        sumDaily: function(day) {
            var totals = {},
                keys = Object.keys(day.meals[0].totals);

            keys.forEach(function(key) {
                totals[key] = self.foodSum(day, key);
            });
            
            totals.display = helpers.formatTotaledDecimals(totals, keys);

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

        set_calorie_target: function (dailyMeals, targets) {
            if (dailyMeals.totals.food_calories < targets.calorie_target) {
                dailyMeals.calorie_target = targets.calorie_target;
                dailyMeals.calorieWarning = true;
            }
        },

        set_protein_target: function (dailyMeals, targets) {
            if (dailyMeals.totals.food_protein < targets.protein_target) {
                dailyMeals.protein_target = targets.protein_target;
                dailyMeals.proteinWarning = true;
            }
        },

        set_sugar_target: function (dailyMeals, targets) {
            if (dailyMeals.totals.food_sugar > Number(targets.sugar_target)) {
                dailyMeals.sugar_target = targets.sugar_target;
                dailyMeals.sugarWarning = true;
            }

        },

        set_fiber_target:  function (dailyMeals, targets) {
            if ((dailyMeals.totals.food_fiber / ((dailyMeals.totals.food_calories / 1000))) < Number(targets.fiber_target)) {
                dailyMeals.fiber_target = targets.fiber_target;
                dailyMeals.fiberWarning = true;
            }

        },

        required_foods_warning: function (dailyMeals, targets) {
            var reqFoods = {
                keys: []
            };

            dailyMeals.requiredFoodsTargets = [];

                targets.requiredFoods.forEach(function (food) {
                    helpers.selectFoodUnit(food);
                    reqFoods[food._id] = food;
                    reqFoods[food._id].appliedCount = 0;
                    reqFoods.keys.push(food._id);
                });
            
            dailyMeals.meals.forEach(function (meal) {
                meal.foods.forEach(function (item) {
                    if (reqFoods[item._id]) {
                        reqFoods[item._id].appliedCount += Number(item.count);
                    }
                })
            });

            reqFoods.keys.forEach(function(key) {
                var theFood = helpers.extend({}, reqFoods[key]);

                if (theFood.appliedCount < theFood.count) {
                    dailyMeals.requiredFoodsWarning = true;
                    dailyMeals.requiredFoodsTargets.push(theFood);
                }
            });
        },

        processTabs: helpers.processTabs
    };

    return self;
})();

module.exports = NutritionCollection;