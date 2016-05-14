/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var helpers = require('helpers'),
        Mustache = require('mustache'),
        moment = require('moment'),
        formModule = {},
        rideTemplate = require('text!/templates/partials/rides/ride'),
        activityTemplate = require('text!/templates/partials/activities/activity'),
        addtlInfoTemplate = require('text!/templates/partials/rides/additionalInfo'),
        addtlActivityInfoTemplate = require('text!/templates/partials/activities/additionalInfo'),
        yearlyStatsTemplate = statsTemplate = require('text!/templates/partials/rides/yearlyQuickGlance'),
        statsTemplate = require('text!/templates/partials/rides/stats');

    return (function () {
        var self = {

            cacheDom: function () {
                self.dom = {};
                self.dom.component = $('#monthlyOverview');
                self.dom.tabs = $('#monthly-overview-tabs');
                self.dom.tabButtons = self.dom.tabs.find('button');
                self.dom.yearSelection = $('#yearSelection');
                self.dom.newRide = $('#new_ride');
                self.dom.newFoodItem = $('#new_food');
                self.dom.newMeal = $('#new_meal');
                self.dom.newFoodItemPrecedent = self.dom.newFoodItem.parents('header');

                self.dom.newRidePrecedent = self.dom.newRide.parents('header');
                self.dom.activityList = self.dom.component.find('.activity-list');
                self.dom.newActivity = $('#new_activity');
                self.dom.newActivityPrecedent = self.dom.newActivity.parents('header');
            },

            init: function() {
                self.cacheDom();
                self.attachHandlers();
                self.loadFormModule();

                return self;
            },

            attachHandlers: function() {
                self.dom.tabButtons.on('click', self.navigateToMonth);
                self.dom.yearSelection.on('change', self.navigateToYear);
                self.dom.component.on('click', '.expand-row, .view_meal', self.expandRow);

                /* Ride View */
                self.dom.newRide.on('click', self.toggleNewRide);
                self.dom.component.on('click', '.edit-ride', self.editRide);
                self.dom.component.on('click', '.duplicate-ride', self.duplicateRide);

                /* Activity View */
                self.dom.newActivity.on('click', self.toggleNewActivity);
                self.dom.component.on('click', '.edit-activity', self.editActivity);
                self.dom.component.on('click', '.edit_meal', self.editMeal);

                /* New Food Item View */
                self.dom.newFoodItem.on('click', self.toggleNewFood);
                self.dom.component.on('change', '.populate_food', self.populateFood);
                self.dom.component.on('click', '.edit_food', self.editFood)

                /*  New Meal View */
                self.dom.newMeal.on('click', self.toggleNewMeal);

            },

            loadFormModule: function() {
                var relationships = [
                    {rideForm: self.dom.newRide},
                    {activityForm: self.dom.newActivity},
                    {foodForm: self.dom.newFoodItem, double: true},
                    {mealForm: self.dom.newMeal, double: true}
                ];

                relationships.forEach(function(item) {
                    var key = Object.keys(item)[0];

                    if (item[key].length) {
                        if (item.double) {
                            require([key], function(module) {
                                formModule = Object.keys(formModule).length ? formModule : {};
                                formModule[key] = module;
                            });
                        } else {
                            require([key], function(module) {
                                formModule = module;
                            });
                        }

                        return;
                    }
                });
            },

            expandRow: function(e) {
                e.preventDefault();

                var clicked = $(e.currentTarget),
                    row = clicked.parents('tr').eq(0),
                    siblings = row.siblings();

                siblings.removeClass('open');
                row.toggleClass('open');
            },

            navigateToMonth: function(e) {
                var clicked = $(e.currentTarget),
                    active = clicked.hasClass('active');

                if (!active) {
                    window.location.href = window.location.protocol + '//' + window.location.host + '/' + clicked.data('path');
                }
            },

            navigateToYear: function(e) {
                window.location.href = window.location.protocol + '//' + window.location.host + '/' + self.dom.yearSelection.val();
            },

            restripe: function() {
                if (self.dom.update.insert.restripe) {
                    self.dom.activityList.find('.activity-data').each(function(i) {
                        var row = $(this),
                            className = i % 2 == 0 ? 'even' : 'odd';

                        row.removeClass('even odd');
                        row.addClass(className);
                    });
                }
            },

            /*************/
            /* Ride View */
            /*************/

            toggleNewRide: function(e) {
                e.preventDefault();

                self.genericNewRideForm();
            },

            duplicateRide: function(e) {
                e.preventDefault();
                var clicked = $(e.currentTarget),
                    id = clicked.data('id'),
                    ride = 'api/ride/' + id;

                require(['json!/' + ride + helpers.cacheBust()], function(ride) {
                    self.genericNewRideForm(ride[0]);
                });
            },

            genericNewRideForm: function(model) {
                self.dom.update = {};
                self.dom.update.stats = $('#monthly_stats');
                self.dom.update.yearlyStats = $('#at_a_glance');

                model = $.extend(model, {
                    date: {formatted: moment().format('MM/DD/YYYY')},
                    action: '/api/new'
                });

                formModule.init({
                    model: model,
                    formInsertEl: self.dom.newRidePrecedent,
                    insertMethod: 'after',
                    animate: true,
                    openCallback: function() {
                        self.dom.newRide.attr('disabled', 'disabled');
                    },
                    closeCallback: function() {
                        self.dom.newRide.removeAttr('disabled');
                    },
                    saveCallback: self.saveNewRide
                });
            },

            editRide: function(e) {
                e.preventDefault();
                var clicked = $(e.currentTarget),
                    wrapper = clicked.parents('td'),
                    id = clicked.data('id'),
                    disabled = clicked.hasClass('disabled'),
                    ride = 'api/ride/' + id;

                if (!disabled) {
                    self.dom.update = {};
                    self.dom.update.addtlInfo = clicked.parents('.additional-info');
                    self.dom.update.row = self.dom.update.addtlInfo.prev();
                    self.dom.update.stats = $('#monthly_stats');
                    self.dom.update.yearlyStats = $('#at_a_glance');

                    require(['json!/' + ride + helpers.cacheBust()], function(ride) {
                        formModule.init({
                            model: $.extend(ride[0], {
                                action: '/api/update',
                                deleteAction: '/api/delete'
                            }),
                            action: false,
                            formInsertEl: wrapper,
                            insertMethod: 'append',
                            animate: true,
                            openCallback: function() {
                                clicked.toggleClass('disabled');
                            },
                            closeCallback: function() {
                                clicked.toggleClass('disabled');
                            },
                            saveCallback: self.updateRide,
                            deleteCallback: self.deleteRide
                        });
                    });
                }
            },

            editMeal: function (e) {
                e.preventDefault();
                var clicked = $(e.currentTarget),
                    model = self.processEncodedMeal(clicked.data('meal')),
                    row = clicked.parent().parent(),
                    wrapper = row.next().find('.meal_edit'),
                    action = 'api/meal/edit';

                model.action = action;

                if (!formModule.mealForm.isOpen) {
                    formModule.mealForm.init({
                        model: model,
                        formInsertEl: wrapper,
                        insertMethod: 'html',
                        animate: false,
                        openCallback: function() {
                            self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).attr('disabled', 'disabled');
                            row.addClass('open');
                            formModule.mealForm.renderMeal();
                        },
                        closeCallback: function() {
                            self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).removeAttr('disabled');
                        },
                        saveCallback: function () {
                            self.saveNewFood();
                            location.reload();

                        }
                    });
                } else {
                    formModule.mealForm.close();
                }

            },

            saveNewRide: function(ride) {
                var activityHelper = helpers.activityHelpers(ride);

                self.dom.update.insert = self.setRowInsertionParams(activityHelper.activityDate);
                ride.ui.className = self.dom.update.insert.className;

                require(
                    [
                        'json!/api/stats/' + activityHelper.month + activityHelper.cacheBust,
                        'json!/api/stats/' + activityHelper.year + activityHelper.cacheBust
                    ],
                    function(monthlyStats, yearlyStats) {
                        var newRow = Mustache.render(rideTemplate, ride),
                            newInfo = Mustache.render(addtlInfoTemplate, ride),
                            updatedStats = Mustache.render(statsTemplate, monthlyStats),
                            updatedYearlyStats = Mustache.render(yearlyStatsTemplate, yearlyStats);

                        if (self.dom.update.insert.required) {
                            self.dom.update.insert.el[self.dom.update.insert.method](newRow + newInfo);
                            self.dom.update.stats.replaceWith(updatedStats);
                            self.restripe();
                        }
                        self.dom.update.yearlyStats.replaceWith(updatedYearlyStats);

                        delete(self.dom.update);
                    });
            },

            setRowInsertionParams: function(rideDate) {
                var rides = self.dom.activityList.find('.activity-data'),
                    hasRides = rides.length,
                    month = moment(self.dom.component.data('monthStart')),
                    isToday = moment().diff(rideDate, 'days') === 0,
                    required = month.diff(rideDate, 'months') === 0,
                    insert = {
                        required: required,
                        className: hasRides % 2 ? 'odd' : 'even'
                    };

                if (isToday && required) {
                    insert.el = self.dom.activityList;
                    insert.method = hasRides ? 'append' : 'html';
                } else if (required) {
                    insert.el = self.findPreviousRide(rideDate, rides);
                    insert.method = 'after';
                    insert.restripe = true;
                }

                return insert;
            },

            findPreviousRide: function(rideDate, rides) {
                var rideLen = rides.length,
                    pos = rideLen - 1,
                    ride = rides.eq(pos);

                while (rideLen >= 0) {
                    var date = moment(new Date(ride.data('date')));

                    if (rideDate.diff(date, 'days') >= 0) {
                        break;
                    }

                    pos -= 1;
                    ride = rides.eq(pos);
                }

                return ride.next();
            },

            updateRide: function(ride) {
                var activityHelper = helpers.activityHelpers(ride);

                ride.ui.className = self.dom.update.row.attr('class');

                require(
                    [
                        'json!/api/stats/' + activityHelper.month + activityHelper.cacheBust,
                        'json!/api/stats/' + activityHelper.year + activityHelper.cacheBust
                    ],
                    function(monthlyStats, yearlyStats) {
                        var updatedRow = Mustache.render(rideTemplate, ride),
                            updatedInfo = Mustache.render(addtlInfoTemplate, ride),
                            updatedStats = Mustache.render(statsTemplate, monthlyStats),
                            updatedYearlyStats = Mustache.render(yearlyStatsTemplate, yearlyStats);

                        self.dom.update.row.replaceWith(updatedRow);
                        self.dom.update.addtlInfo.replaceWith(updatedInfo);
                        self.dom.update.stats.replaceWith(updatedStats);
                        self.dom.update.yearlyStats.replaceWith(updatedYearlyStats);

                        delete(self.dom.update);
                });
            },

            deleteRide: function(ride) {
                var activityHelper = helpers.activityHelpers(ride);

                self.dom.update.insert = {restripe: true};

                require(
                    [
                        'json!/api/stats/' + activityHelper.month + activityHelper.cacheBust,
                        'json!/api/stats/' + activityHelper.year + activityHelper.cacheBust
                    ],
                    function(monthlyStats, yearlyStats) {
                        var updatedStats = Mustache.render(statsTemplate, monthlyStats),
                            updatedYearlyStats = Mustache.render(yearlyStatsTemplate, yearlyStats);

                        self.dom.update.row.add(self.dom.update.addtlInfo).remove();
                        self.dom.update.stats.replaceWith(updatedStats);
                        self.dom.update.yearlyStats.replaceWith(updatedYearlyStats);
                        self.restripe();

                        delete(self.dom.update);
                });
            },

            /*************/
            /* Food View */
            /*************/

            toggleNewFood: function(e) {
                e.preventDefault();

                self.genericNewFoodForm();
            },

            editFood: function(e) {
                e.preventDefault();

                self.genericNewFoodForm({edit: true, editFood: true});
            },

            genericNewFoodForm: function (model) {
                self.dom.update = {};
                self.foods = formModule.mealForm.getFoods();

                var action = model && model.edit ? '/api/food/edit' : '/api/food/new';

                model = $.extend(model, {
                    date: {formatted: moment().format('MM/DD/YYYY')},
                    action: action,
                    foods: self.foods
                });

                formModule.foodForm.init({
                    model: model,
                    formInsertEl: self.dom.newFoodItemPrecedent,
                    insertMethod: 'after',
                    animate: true,
                    openCallback: function() {
                        self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).attr('disabled', 'disabled');
                    },
                    closeCallback: function() {
                        self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).removeAttr('disabled');
                    },
                    saveCallback: function () {
                        self.saveNewFood();
                        location.reload();
                    }
                });
            },

            saveNewFood: function(food) {
                if (food) {
                    self.dom.newMeal.data('foods', food);
                }
            },

            populateFood: function (e) {
               var changed = $(e.target),
                   selected = changed.find(':selected'),
                   index = selected.data('index');

                formModule.foodForm.renderPopulated(self.foods[index])
            },

            /*************/
            /* Meal View */
            /*************/

            toggleNewMeal: function(e) {
                e.preventDefault();

                self.genericNewMealForm();
            },

            genericNewMealForm: function (model) {
                self.dom.update = {};

                model = $.extend(model, {
                    date: {formatted: moment().format('MM/DD/YYYY')},
                    action: '/api/meal/new'
                });

                formModule.mealForm.init({
                    model: model,
                    formInsertEl: self.dom.newFoodItemPrecedent,
                    insertMethod: 'after',
                    animate: true,
                    openCallback: function() {
                        self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).attr('disabled', 'disabled');
                    },
                    closeCallback: function() {
                        self.dom.newFoodItem.add(self.dom.newMeal).add($('#edit_food')).removeAttr('disabled');
                    },
                    saveCallback: function () {
                        self.saveNewFood();
                        location.reload();
                    }
                });
            },

            saveNewMeal: function(food) {

            },


            /*****************/
            /* Activity View */
            /*****************/

            toggleNewActivity: function(e) {
                e.preventDefault();

                self.genericNewActivityForm();
            },

            genericNewActivityForm: function(model) {
                self.dom.update = {};

                model = $.extend(model, {
                    date: {formatted: moment().format('MM/DD/YYYY')},
                    action: '/api/activity/new'
                });

                formModule.init({
                    model: model,
                    formInsertEl: self.dom.newActivityPrecedent,
                    insertMethod: 'after',
                    animate: true,
                    openCallback: function() {
                        self.dom.newActivity.attr('disabled', 'disabled');
                    },
                    closeCallback: function() {
                        self.dom.newActivity.removeAttr('disabled');
                    },
                    saveCallback: self.saveNewActivity
                });
            },

            saveNewActivity: function(activity) {
                self.dom.update.insert = self.setRowInsertionParams(moment(new Date(activity.date.raw)));
                activity.ui.className = self.dom.update.insert.className;

                var newRow = Mustache.render(activityTemplate, activity),
                    newInfo = Mustache.render(addtlActivityInfoTemplate, activity);

                if (self.dom.update.insert.required) {
                    self.dom.update.insert.el[self.dom.update.insert.method](newRow + newInfo);
                    self.restripe();
                }

                delete(self.dom.update);
            },

            editActivity: function(e) {
                e.preventDefault();
                var clicked = $(e.currentTarget),
                    wrapper = clicked.parents('td'),
                    id = clicked.data('id'),
                    disabled = clicked.hasClass('disabled'),
                    activity = 'api/activity/' + id;

                if (!disabled) {
                    self.dom.update = {};
                    self.dom.update.addtlInfo = clicked.parents('.additional-info');
                    self.dom.update.row = self.dom.update.addtlInfo.prev();

                    require(['json!/' + activity + helpers.cacheBust()], function(activity) {
                        formModule.init({
                            model: $.extend(activity[0], {
                                action: '/api/activity/update',
                                deleteAction: '/api/activity/delete'
                            }),
                            action: false,
                            formInsertEl: wrapper,
                            insertMethod: 'append',
                            animate: true,
                            openCallback: function() {
                                clicked.toggleClass('disabled');
                            },
                            closeCallback: function() {
                                clicked.toggleClass('disabled');
                            },
                            saveCallback: self.updateActivity,
                            deleteCallback: self.deleteActivity
                        });
                    });
                }
            },

            updateActivity: function(activity) {
                activity.ui.className = self.dom.update.row.attr('class');

                var updatedRow = Mustache.render(activityTemplate, activity),
                    updatedInfo = Mustache.render(addtlActivityInfoTemplate, activity);

                self.dom.update.row.replaceWith(updatedRow);
                self.dom.update.addtlInfo.replaceWith(updatedInfo);

                delete(self.dom.update);
            },

            deleteActivity: function(activity) {
                self.dom.update.insert = {restripe: true};

                self.dom.update.row.add(self.dom.update.addtlInfo).remove();
                self.restripe();

                delete(self.dom.update);
            },

            processEncodedMeal: function (meal) {
                meal.inProgress = true;
                meal.selectedFoods = meal.foods;
                meal.selectedFoodTotals = meal.totals;
                meal.date = {
                    formatted: meal.meal_date
                };
                meal.edit = true;

                return meal;
            }
        };

        return self.init();
    })();
});