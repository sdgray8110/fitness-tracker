/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var helpers = require('helpers'),
        serializeObject = require('serializeObject'),
        validation = require('validation');

    return (function () {
        var self = {
            init: function() {
                self.cacheDom();
                self.applyValidation();
            },

            cacheDom: function () {
                self.dom = {};
                self.dom.form = $('#settings_form');
                self.dom.errorContainer = $('#settings_messaging');
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

            save: function() {
                var formData = self.dom.form.serializeObject();

                $.ajax({
                    url: self.dom.form.attr('action'),
                    type: 'POST',
                    data: formData
                }).done(self.applySuccessMessaging);
            },

            applySuccessMessaging: function (res) {
                var $message = $('<p />').attr('class', 'message').html(res.message),
                    $container = $('<div />').attr('class', 'notice').html($message);

                self.dom.errorContainer.html($container);

                setTimeout(function() {
                    self.dom.errorContainer.html('');
                }, 5000);
            }

        };

        return self.init();
    })();
});