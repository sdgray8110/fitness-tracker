/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var helpers = require('helpers'),
        Mustache = require('mustache'),
        maskedInput = require('maskedInput'),
        serializeObject = require('serializeObject'),
        validation = require('validation'),
        mealForm = require('text!/templates/partials/forms/mealForm'),        
        foodsList = require('text!/templates/partials/forms/foodsList'),
        selectedFoods = require('text!/templates/partials/forms/selectedFoods'),
        targetForm = require('text!/templates/partials/forms/targetForm'),
        dataFields = require('text!/templates/partials/forms/formDataFields'),
        foodlistitems = require('text!/templates/partials/forms/food_selection'),
        foodDetails = require('text!/templates/partials/nutrition/food_info'),
        formConfig = require('json!/api/form-config');

    return (function () {
        var self = {

            isOpen: false,

            settings: {
                model: {},
                new: true,
                formInsertEl: null, // Required
                insertMethod: 'html',
                animate: false,
                openCallback: $.noop(),
                closeCallback: $.noop(),
                saveCallback: $.noop(),
                deleteCallback: $.noop()
            },

            cacheDom: function () {
                self.dom.formInsertLocation = $(self.options.formInsertEl);
                self.dom.fieldContainer = $('#food-form-data-fields');
                self.dom.form = $('#newMealForm');
                self.dom.formFieldContainer = $('#food-form-data-fields');
                self.dom.errorContainer = self.dom.form.find('.food-messaging');
                self.dom.foodSelectionContainer = $('#food_selection_container');
                self.dom.close = $('#close_meal_form');
                self.dom.date = $('#date');
                self.dom.duration = $('#duration');
                self.dom.search_foods = $('#search_foods');
            },

            getFoods: function() {
                var foods = $('#new_meal').data('foods');

                foods.forEach(function(food, i) {
                   food.index = i;
                    helpers.selectFoodUnit(food);
                });

                return foods;
            },

            setModel: function() {
                self.model = $.extend(self.options.model, formConfig);
                self.model.meal_edit = false;

                var edit = self.model.action.match('edit');
                var newMeal = self.model.action.match('new');

                if (edit) {
                    self.model.meal_edit = true;
                }

                self.model.filteredFoods = self.getFoods();
                self.model.unfilteredFoods = self.getFoods();
                self.model.chosenFoods = [];

                self.model.selectedFoods = self.model.selectedFoods || [];
            },

            setTargetsModel: function () {
                self.model = $.extend(self.options.model, formConfig);
                self.model.fields = formConfig.formFields.targets;
            },

            resetModel: function() {
                self.model = {};
            },

            init: function(options) {
                if (self.isOpen) {
                    self.close().done(function() {
                        self.open(options);
                    });
                } else {
                    self.open(options);
                }
            },

            targetsInit: function(options) {
                if (self.isOpen) {
                    self.close().done(function() {
                        self.openTargets(options);
                    });
                } else {
                    self.openTargets(options);
                }
            },

            open: function(options) {
                self.dom = {};
                self.options = $.extend(self.settings, options);
                self.setModel();
                self.render();
                self.cacheDom();
                self.renderFoodSelect();
                self.attachHandlers();

                self.isOpen = true;
                self.options.openCallback();
                return self;
            },

            openTargets: function(options) {
                self.dom = {};
                self.options = $.extend(self.settings, options);
                self.setTargetsModel();
                self.renderTargets();
                self.cacheDom();

                self.dom.form = $('#dailyTargetForm');

                self.attachHandlers();

                self.isOpen = true;
                self.options.openCallback();
                return self;
            },

            attachHandlers: function() {
                self.dom.close.on('click', self.close);
                //self.dom.deleteActivity.on('click', self.delete);
                self.dom.form.on('click', '.select_food', self.applyChosenFoods);
                self.dom.form.on('keyup', '.foodQuantity', self.updateQuantity);
                self.dom.form.on('click', '.delete_item', self.removeItemFromMeal);
                self.dom.form.on('click', '#delete_meal', self.deleteMeal);
                self.dom.form.on('click', '#close_targets', self.closeTargets);
                self.dom.form.on('keyup', '#search_foods', self.filterFoods);
                self.dom.form.on('change', '.food_checkbox', self.selectFood);

                self.applyValidation();
            },

            filterFoods: function (e) {
                var term = $(e.target).val().toLowerCase(),
                    chosenFoodList = self.model.chosenFoods.map(function (food) {
                       return food._id;
                    });


                self.model.filteredFoods = self.model.unfilteredFoods.filter(function (food, i) {
                    if (chosenFoodList.indexOf(food._id) >= 0) {
                        food.checked = true;
                    }

                    return food.food_name.toLowerCase().indexOf(term) >= 0;
                });

                self.renderFoodListComponent();
            },

            selectFood: function(e) {
                var selected = $(e.target),
                    checked = selected.is(':checked'),
                    index = selected.data('index'),
                    item = self.model.unfilteredFoods[index];

                if (checked) {
                    self.model.chosenFoods.push(item);
                } else {
                    self.deselectFood(item);
                }

                self.renderFoodDetails();
            },

            deselectFood: function (item) {
                self.model.chosenFoods = self.model.chosenFoods.filter(function (food) {
                    return food._id !== item._id
                });
            },

            applyChosenFoods: function (e) {
                self.processSelectedFoods();
                self.updateTotals();
                self.model.inProgress = true;
                self.renderMeal();
            },

            updateQuantity: helpers.debounce(function(e) {
                var changed = $(e.target),
                    id = changed.attr('name').replace('count_', '');

                self.model.selectedFoods.forEach(function(food) {
                    if (food._id === id) {
                        food.count = (changed.val() * 1);
                    }
                });

                self.updateTotals();
                self.renderMeal();
            }, 750),

            processSelectedFoods: function() {
                var match = false;

                self.model.chosenFoods.forEach(function (item) {
                    item.count = item.count || 1;

                    self.model.selectedFoods.forEach(function(food) {
                        if(item._id === food._id) {
                            food.count = (food.count * 1) + 1;
                            match = true;
                        }
                    });

                    if(!match) {
                        self.model.selectedFoods.push(item);
                    }

                    return item;
                });
            },

            updateTotals: function () {
                var totals = {},
                    keys = Object.keys(self.model.selectedFoods[0]),
                    value;

                keys.forEach(function(key) {
                    value = self.foodSum(self.model.selectedFoods, key);

                    if (value !== false) {
                        totals[key] = value;
                    }
                });

                self.model.selectedFoodTotals = totals;
            },

            foodSum: function (model, key) {
                var exclude = ['_id', 'count', 'food_name', 'activityID', 'index'],
                    value = 0;

                if($.inArray(key, exclude) < 0) {
                    self.model.selectedFoods.forEach(function(item) {
                        value = value ? value * 1 : 0;

                        value = (item[key] * item.count) + value
                    });

                    return value;
                }

                return false;
            },

            applyValidation: function() {
                self.validation = validation.create({
                    formEl: self.dom.form,
                    errorContainer: self.dom.errorContainer,
                    scrollToErrors: false,
                    callback: self.save
                });
            },

            maskInputs: function() {
                $('#meal_date').mask('99/99/9999');
                $('#duration').mask('99:99:99');
            },

            save: function() {
                var formData = $.extend(self.dom.form.serializeObject(), {
                    foods: JSON.stringify(self.model.selectedFoods),
                    totals: JSON.stringify(self.model.selectedFoodTotals),
                   
                }),
                    keys = Object.keys(formData);

                if(!formData.mealID) {
                    delete(formData.mealID);
                }
                
                delete(formData.food_selection);

                keys.forEach(function(key) {
                    if(key.startsWith('count_')) {
                        console.log(key);
                        delete(formData[key]);
                    }
                });
                
                $.ajax({
                    url: self.model.action,
                    type: 'POST',
                    data: formData
                }).done(function(res) {
                    var method = self.dom.mealForm && self.dom.mealForm.length ? self.close : self.closeTargets;

                    method().done(function() {
                        self.options.saveCallback(res);
                    });
                });
            },


            deleteMeal: function(e) {
                e.preventDefault();

                var formData = self.dom.form.serializeObject();

                $.ajax({
                    url: '/api/meal/delete',
                    type: 'POST',
                    data: formData
                }).done(function(res) {
                    location.reload();
                });
            },

            render: function() {
                self.dom.mealForm = $(Mustache.render(mealForm, self.model));

                self.options.formInsertEl[self.options.insertMethod](self.dom.mealForm);


                if (self.model.inProgress) {
                    self.renderMeal();
                }

                if (self.options.animate) {
                    self.dom.mealForm.slideDown(400);
                }
            },

            renderTargets: function () {
                self.dom.targetsForm = $(Mustache.render(targetForm, self.model, {
                    dataFields: dataFields
                }));

                self.options.formInsertEl[self.options.insertMethod](self.dom.targetsForm);

                if (self.options.animate) {
                    self.dom.targetsForm.slideDown(400);
                }   
            },
            
            renderFoodSelect: function() {
                var select = $(Mustache.render(foodsList, self.model, {foodlistitems: foodlistitems}));

                self.dom.foodSelectionContainer.html(select);
            },

            renderFoodListComponent: function () {
                var component = $(Mustache.render(foodlistitems, self.model));

                $('#foodlistitems').html(component);
                self.renderFoodDetails();
            },

            renderFoodDetails: function () {
                var component = $(Mustache.render(foodDetails, self.model));

                $('#food_info').html(component);
            },

            renderMeal: function () {
                var view = $(Mustache.render(selectedFoods, self.model));

                $('#selected_foods').html(view);
            },

            removeItemFromMeal: function (e) {
                var clicked = $(e.target),
                    id = clicked.data('id');


                self.deleteMatchedFoodById(id);
                self.updateTotals();
                self.renderMeal();

            },

            deleteMatchedFoodById: function (id) {
                var items = [];

                self.model.selectedFoods.forEach(function (foodItem, i) {
                    if(foodItem._id !== id) {
                        items.push(foodItem);
                    }
                });

                self.model.selectedFoods = items;
            },

            close: function() {
                var deferred = new $.Deferred();

                if (self.options.animate) {
                    self.dom.mealForm.slideUp(400, function() {
                        self.destroy();
                        deferred.resolve();
                    });
                } else {
                    self.destroy();
                    deferred.resolve();
                }

                return deferred;
            },

            closeTargets: function() {
                var deferred = new $.Deferred();

                if (self.options.animate) {
                    self.dom.targetsForm.slideUp(400, function() {
                        self.destroy();
                        deferred.resolve();
                    });
                } else {
                    self.destroy();
                    deferred.resolve();
                }

                return deferred;
            },

            destroy: function() {
                self.resetModel();
                if (self.dom.mealForm && self.dom.mealForm.length) {
                    self.dom.mealForm.remove();
                }

                if (self.dom.targetsForm && self.dom.targetsForm.length) {
                    self.dom.targetsForm.remove();
                }

                self.options.closeCallback();
                self.isOpen = false;
            }
        };

        return self;
    })();
});