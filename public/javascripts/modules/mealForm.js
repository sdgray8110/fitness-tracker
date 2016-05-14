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
            },

            getFoods: function() {
                var foods = $('#new_meal').data('foods');

                foods.forEach(function(food, i) {
                   food.index = i;helpers.selectFoodUnit(food);
                });

                return foods;
            },

            setModel: function() {
                self.model = $.extend(self.options.model, formConfig);
                self.model.meal_edit = false;

                if (self.model.action.match('edit').length) {
                    self.model.meal_edit = true;
                    self.model.meal_foods = self.getFoods();
                }
                //self.model.foods = self.getFoods();
                self.model.selectedFoods = self.model.selectedFoods || [];
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

            attachHandlers: function() {
                self.dom.close.on('click', self.close);
                //self.dom.deleteActivity.on('click', self.delete);
                self.dom.form.on('click', '.select_food', self.selectFood);
                self.dom.form.on('keyup', '.foodQuantity', self.updateQuantity);
                self.dom.form.on('click', '.delete_item', self.removeItemFromMeal)
                self.applyValidation();
            },

            selectFood: function(e) {
                var selected = $('#food_selection').find(':selected'),
                    index = selected.data('index'),
                    item = self.model.foods[index];

                if (selected.val()) {
                    self.processSelectedFoods(item);
                    self.updateTotals();
                    self.model.inProgress = true;
                }

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

            processSelectedFoods: function(item) {
                var match = false;

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
                    self.close().done(function() {
                        self.options.saveCallback(res);
                    });
                });
            },

            delete: function(e) {
                e.preventDefault();

                var formData = self.dom.form.serializeObject();

                $.ajax({
                    url: self.model.deleteAction,
                    type: 'POST',
                    data: formData
                }).done(function(res) {
                    self.close().done(function() {
                        self.options.deleteCallback(res);
                    });
                });
            },

            render: function() {
                self.dom.mealForm = $(Mustache.render(mealForm, self.model));

                self.options.formInsertEl[self.options.insertMethod](self.dom.mealForm);
                //self.setActivityType();

                if (self.options.animate) {
                    self.dom.mealForm.slideDown(400);
                }
            },

            renderFoodSelect: function() {
                var select = $(Mustache.render(foodsList, self.model));

                self.dom.foodSelectionContainer.html(select);
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

            destroy: function() {
                self.resetModel();
                self.dom.mealForm.remove();
                self.options.closeCallback();
                self.isOpen = false;
            }
        };

        return self;
    })();
});