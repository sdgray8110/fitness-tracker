/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var Mustache = require('mustache'),
        maskedInput = require('maskedInput'),
        serializeObject = require('serializeObject'),
        validation = require('validation'),
        newRideForm = require('text!/templates/partials/forms/newRideForm'),
        newRideFormDataFields = require('text!/templates/partials/forms/formDataFields'),
        commonRides = require('json!/api/common-rides'),
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
                self.dom.fieldContainer = $('#ride-form-data-fields');
                self.dom.form = $('#newRideForm');
                self.dom.errorContainer = self.dom.form.find('.ride-messaging');
                self.dom.commonRides = $('#common_rides');
                self.dom.close = $('#close_ride_form');
                self.dom.deleteRide = $('#delete_ride');
            },

            setModel: function() {
                self.model = self.options.model;
                self.model.commonRides = commonRides;
                self.model.fields = formConfig.formFields.ride;
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
                self.maskInputs();
                self.applyValidation();

                self.isOpen = true;
                self.options.openCallback();
                return self;
            },

            attachHandlers: function() {
                self.dom.commonRides.on('change', self.populateFromCommonRides);
                self.dom.close.on('click', self.close);
                self.dom.deleteRide.on('click', self.delete);
            },

            applyValidation: function() {
                if (typeof(self.validation) !== 'undefined') {
                    self.validation.destroy();
                }

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

            populateFromCommonRides: function() {
                var index = self.dom.commonRides.val(),
                    model = $.extend(self.model.commonRides[index], {fields: formConfig.formFields.ride}),
                    template = Mustache.render(newRideFormDataFields, model);

                self.dom.fieldContainer.html(template);
                self.maskInputs();
                self.applyValidation();
            },

            save: function() {
                var formData = self.dom.form.serializeObject();

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
                self.dom.rideForm = $(Mustache.render(newRideForm, self.model, {newRideFormDataFields: newRideFormDataFields}));

                self.options.formInsertEl[self.options.insertMethod](self.dom.rideForm);

                if (self.options.animate) {
                    self.dom.rideForm.slideDown(400);
                }
            },

            close: function() {
                var deferred = new $.Deferred();

                if (self.options.animate) {
                    self.dom.rideForm.slideUp(400, function() {
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
                self.dom.rideForm.remove();
                self.validation.destroy();
                self.options.closeCallback();
                self.isOpen = false;
            }
        };

        return self;
    })();
});