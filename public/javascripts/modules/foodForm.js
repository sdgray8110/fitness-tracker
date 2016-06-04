/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var helpers = require('helpers'),
        Mustache = require('mustache'),
        maskedInput = require('maskedInput'),
        serializeObject = require('serializeObject'),
        validation = require('validation'),
        newFoodForm = require('text!/templates/partials/forms/newFoodForm'),
        foodForm = require('text!/templates/partials/forms/foodForm'),
        foodsList = require('text!/templates/partials/forms/foodsList'),
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
                self.dom.form = $('#newFoodForm');
                self.dom.formFieldContainer = $('#food-form-data-fields');
                self.dom.errorContainer = self.dom.form.find('.food-messaging');
                self.dom.close = $('#close_food_form');
                self.dom.date = $('#date');
                self.dom.duration = $('#duration');
            },

            setModel: function() {
                self.model = $.extend(self.options.model, formConfig);
                self.model.activityTypes.forEach(function(type) {
                    if (type.type === self.model.type) {
                        type.selected = true;
                    }
                });

                self.model.checked = [];
            },

            resetModel: function() {
                self.model = {};

                formConfig.activityTypes.forEach(function(type) {
                    if (type.selected) {
                        delete(type.selected);
                    }
                });
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
                self.attachHandlers();

                self.isOpen = true;
                self.options.openCallback();
                return self;
            },

            attachHandlers: function() {
                self.dom.form.on('click', '#close_food_form', self.close);
                self.dom.form.on('click', '#delete_food', self.delete);
                //self.dom.deleteActivity.on('click', self.delete);
                self.dom.form.on('keyup', '#search_foods', self.filterFoods);
                self.dom.form.on('change', '.checkbox input', self.selectFoodToEdit);
                self.applyValidation();
            },

            filterFoods: function (e) {
                var term = $(e.target).val().toLowerCase();

                self.model.filteredFoods = self.model.unfilteredFoods.filter(function (food, i) {
                    return food.food_name.toLowerCase().indexOf(term) >= 0;
                });

                self.renderFoodListComponent();
            },

            selectFoodToEdit: function (e) {
                var item = $(e.target),
                    index = item.data('index'),
                    siblings = item.parents('.item').siblings().find('.checkbox input'),
                    checked = item.is(':checked'),
                    food,
                    $el;


                siblings.each(function (i, el) {
                    $el = $(el);

                    if ($el.data('index') !== index) {
                        $el.attr('checked', false);
                    }
                })

                if(checked && !item.is(self.model.checked)) {
                    self.model.checked = item;
                    food = self.model.unfilteredFoods[item.data('index')];
                    food.form_populated = true;

                    helpers.selectFoodUnit(food);
                    self.editFood(food);
                } else if (!checked) {
                    self.model.checked = [];

                    $('#food_form_container').html('');
                    self.cacheDom();
                    self.attachHandlers();
                }

            },

            editFood: function (food) {
                var component =$(Mustache.render(foodForm, food));

                $('#food_form_container').html(component);
                self.cacheDom();
                self.attachHandlers();

                self.isOpen = true;
            },

            changeActivityType: function(e) {
                var selected = self.dom.activityTypeSelection.find(':selected'),
                    index = selected.data('index'),
                    model = self.model.activityTypes[index];

                if (!selected.val()) {
                    self.dom.formFieldContainer.html('');
                    self.applyValidation();
                    return;
                }

                self.model.type = model.type;
                self.model.fields = self.model.formFields[model.type];
                self.setActivityType();
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
                $('#date').mask('99/99/9999');
                $('#duration').mask('99:99:99');
            },

            save: function() {
                var formData = self.dom.form.serializeObject();

                console.log(formData);

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
                helpers.selectFoodUnit(self.model);
                self.model.form_populated = !self.model.editFood;
                self.dom.foodForm = $(Mustache.render(newFoodForm, self.model, {'foodsList': foodsList, 'foodlistitems': foodlistitems, 'foodForm': foodForm}));

                self.options.formInsertEl[self.options.insertMethod](self.dom.foodForm);

                if (self.options.animate) {
                    self.dom.foodForm.slideDown(400);
                }
            },

            renderFoodListComponent: function () {
                var component = $(Mustache.render(foodlistitems, self.model));

                $('#foodlistitems').html(component);
            },


            close: function() {
                var deferred = new $.Deferred();

                if (self.options.animate) {
                    self.dom.foodForm.slideUp(400, function() {
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
                $('#newFoodForm').remove();
                self.options.closeCallback();
                self.isOpen = false;
            }
        };

        return self;
    })();
});