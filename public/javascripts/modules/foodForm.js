/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var Mustache = require('mustache'),
        maskedInput = require('maskedInput'),
        serializeObject = require('serializeObject'),
        validation = require('validation'),
        newFoodForm = require('text!/templates/partials/forms/newFoodForm'),
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
                self.dom.close.on('click', self.close);
                //self.dom.deleteActivity.on('click', self.delete);
                self.applyValidation();
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
                self.dom.foodForm = $(Mustache.render(newFoodForm, self.model));

                self.options.formInsertEl[self.options.insertMethod](self.dom.foodForm);
                //self.setActivityType();

                if (self.options.animate) {
                    self.dom.foodForm.slideDown(400);
                }
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
                self.dom.foodForm.remove();
                self.options.closeCallback();
                self.isOpen = false;
            }
        };

        return self;
    })();
});