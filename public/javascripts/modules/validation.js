/* Form Validation Module  */
/* Dependencies --
 -- jQuery
 -- Helpers
 */

/* Data Attributes */
/* These attributes can be associated with a field for assigning validation */
/*
 data-validation *REQUIRED*
 // This attaches validation to a field //
 // value is the associated validation rule (required, email etc)

 data-validation-message *REQUIRED*
 // The messaging to be rendered when an error is applied

 data-validation-relationship
 // This applies visual validation to a non-form element (ie dropdown)
 // Value is not used. Associated element must have data-field attribute tied to this element's ID
 */

define(function(require) {
    'use strict';

    var helpers = require('helpers');

    return (function() {
        var proto = function() {
            var self = {
                settings: {
                    formEl: null, // jQuery object for form to be validated
                    errorContainer: null, // jQuery object for element where messages will be inserted
                    errorClass: 'validationError',
                    errorContainerClass: 'alert',
                    messageHeaderClass: 'message',
                    multiMessageContainerClass: 'message-items',
                    multiMessageClass: 'message-item',
                    applyToLabel: false,
                    scrollToErrors: false,
                    scrollToPadding: 95,
                    callback: null //
                },

                cacheDom: function() {
                    self.dom = {};
                    self.dom.window = $(window);
                    self.dom.form = self.settings.formEl;
                    self.dom.errorContainer = self.settings.errorContainer;
                },

                init: function(options) {
                    self.options = options;
                    $.extend(self.settings, self.options);

                    self.cacheDom();
                    self.setValidationModel();
                    self.attachHandlers();
                },

                destroy: function() {
                    self.clearErrors();
                    self.dom.form.off('submit validate');
                    self.dom.form.off('keyup');
                    self.dom.form.off('change');
                    self.dom.form.off('clear-errors');
                },

                attachHandlers: function() {
                    var errorSelector = '.' + self.settings.errorClass;

                    self.dom.form.on('submit validate', self.validate);
                    self.dom.form.on('keyup', errorSelector, self.revalidateField);
                    self.dom.form.on('change', errorSelector, self.revalidateField);
                    self.dom.form.on('clear-errors', self.clearErrors);
                },

                setValidationModel: function() {
                    var fields = self.dom.form.find('[data-validation]'),
                        model = {
                            items: {},
                            invalidFields: {
                                count: 0,
                                fields: {}
                            },
                            hasCallback: typeof(self.settings.callback) === 'function'
                        };

                    fields.each(function(i,field) {
                        field = $(field);

                        var data = field.data(),
                            item = {
                                rule: data.validation,
                                required: data.validation === 'required' || data.required,
                                el: field,
                                errorEl: field,
                                id: field.attr('id'),
                                name: field.attr('name'),
                                message: data.validationMessage
                            };

                        self.setRelatedEl(item);

                        model.items[item.id] = item;
                    });

                    self.model = model;
                },

                setRelatedEl: function(item) {
                    var hasRelationship = item.el.data('validationRelationship');

                    if (hasRelationship) {
                        item.relatedEl = $('[data-field="'+item.id+'"]');

                        item.errorEl = item.errorEl.length ? item.relatedEl : item.errorEl;
                    }
                },

                validate: function(e) {
                    self.model.invalidFields.count = 0;

                    for (var key in self.model.items) {
                        var item = self.model.items[key];

                        self.validateField(item);
                    }

                    self.updateMessages();

                    if (self.model.hasCallback && self.model.invalidFields.count === 0) {
                        e.preventDefault();
                        self.settings.callback();
                    }

                    return self.model.invalidFields.count === 0;
                },

                validateField: function(item) {
                    var valid = self.validationRules[item.rule](item);

                    if (!valid) {
                        self.model.invalidFields.fields[item.id] = item;
                        self.addErrorClass(item);
                    } else {
                        self.removeErrorClass(item);
                        delete(self.model.invalidFields.fields[item.id]);
                    }

                    self.model.invalidFields.count = self.objLength(self.model.invalidFields.fields);

                    return valid;
                },

                addErrorClass: function(item) {
                    item.errorEl.addClass(self.settings.errorClass);

                    if (self.settings.applyToLabel) {
                        var label = self.dom.form.find('[for=' + item.id + ']');

                        label.addClass(self.settings.errorClass);
                    }
                },

                removeErrorClass: function(item) {
                    item.errorEl.removeClass(self.settings.errorClass);

                    if (self.settings.applyToLabel) {
                        var label = self.dom.form.find('[for=' + item.id + ']');

                        label.removeClass(self.settings.errorClass);
                    }
                },

                showCustomError: function (message) {
                    var error = '<p class="' + self.settings.messageHeaderClass + '">' + message + '</p>',
                        errorContent = '<div class="' + self.settings.errorContainerClass + '">' + error + '</div>';

                    self.dom.errorContainer.html(errorContent);
                    self.scrollToErrors();
                    self.dom.window.trigger('windowHeightChange');
                },

                showCustomMessage: function(message, messageClass) {
                    message = '<p>' + message + '</p>';

                    var messageContent = '<div class="' + messageClass + '">' + message + '</div>';

                    self.dom.errorContainer.html(messageContent);
                    self.scrollToErrors();
                    self.dom.window.trigger('windowHeightChange');
                },

                revalidateField: function(e) {
                    var el = self.setRevalidationField($(e.currentTarget)),
                        item = self.model.items[el.attr('id')];

                    if (self.validateField(item)) {
                        self.updateMessages(false);
                    }
                },

                setRevalidationField: function(el) {
                    var hasRelationship = el.data('field');

                    if (hasRelationship) {
                        return $(document.getElementById(hasRelationship));
                    }

                    return el;
                },

                scrollToErrors: function(scroll) {
                    scroll = typeof(scroll) !== 'undefined' ? scroll : true;

                    if (self.settings.scrollToErrors && scroll) {
                        helpers.scrollToElement(self.dom.errorContainer, self.settings.scrollToPadding);
                    }
                },

                updateMessages: function(scroll) {
                    var errorContent = '';

                    if (self.model.invalidFields.count) {
                        var method = self.model.invalidFields.count > 1 ?'multipleErrors' : 'singleError',
                            errors = self[method]();

                        errorContent = '<div class="' + self.settings.errorContainerClass + '">' + errors + '</div>';
                    }

                    self.dom.errorContainer.html(errorContent);
                    self.scrollToErrors(scroll);
                    self.dom.window.trigger('windowHeightChange');
                },

                singleError: function() {
                    var error = '';

                    for (var key in self.model.invalidFields.fields) {
                        error += '<p class="' + self.settings.messageHeaderClass + '">' + self.model.invalidFields.fields[key].message + '</p>';
                    }

                    return error;
                },

                multipleErrors: function() {
                    var error = [
                        '<p class="' + self.settings.messageHeaderClass + '">Please correct the following errors:</p>',
                        '<ul class="' + self.settings.multiMessageContainerClass + '">',
                        '</ul>'
                    ];

                    for (var key in self.model.invalidFields.fields) {
                        var message = '<li class="' + self.settings.multiMessageClass + '">' + self.model.invalidFields.fields[key].message + '</li>',
                            position = error.length - 1;

                        error.splice(position,0,message);
                    }

                    return error.join('');
                },

                clearErrors: function() {
                    self.dom.form.find('.' + self.settings.errorClass).removeClass(self.settings.errorClass);
                    self.dom.errorContainer.html('');
                    self.setValidationModel();
                },

                objLength: function(obj) {
                    var len = 0;

                    for (var key in obj) {
                        len += 1;
                    }

                    return len;
                },

                validationRules: {
                    email: function(item) {
                        var value = item.el.val(),
                            regex = /^[A-Za-z0-9][\w,=!#|$%^&*+/?{}~-]+(?:\.[A-Za-z0-9][\w,=!#|$%^&*+/?{}~-]+)*@(?:[A-Za-z0-9-]+\.)+[a-zA-Z]{2,9}$/i;

                        return regex.test(value);
                    },

                    required: function(item) {
                        var value = item.el.val();

                        return $.trim(value) !== '';
                    },

                    zip: function(item) {
                        var value = item.el.val(),
                            regex = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

                        return regex.test(value);
                    },

                    phone: function(item) {
                        var value = item.el.val(),
                            regex = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

                        return regex.test(value);
                    },

                    quantity: function(item) {
                        var value = item.el.val();

                        return parseInt($.trim(value)) > 0;
                    },

                    number: function(item) {
                        var value = item.el.val(),
                            isNumber = !isNaN(value);

                        if (item.required) {
                            return value !== '' && isNumber;
                        }

                        return isNumber;
                    },

                    password: function(item) {
                        var value = item.el.val();

                        return value.length >= 5;
                    },

                    uniqueMealName: function (item) {
                        var value = item.el.val(),
                            date = new Date($('#meal_date').val()),
                            meals = $('.meal-list .edit_meal'),
                            mealDate,
                            dailyMeals = [],
                            names;

                        meals.each(function (i, item) {
                            var el = $(item),
                                meal = el.data('meal'),
                                mealDate = new Date(meal.meal_date);

                            if (date.toString() === mealDate.toString()) {
                                dailyMeals.push(meal);
                            }
                        });

                        names = dailyMeals.map(function(meal) {
                            return meal.meal_name;
                        });

                        if (names.indexOf(value) >= 0) {
                            return false;
                        }

                        return $.trim(value) !== '';
                    },

                    passwordMatch: function(item) {
                        var value = item.el.val(),
                            fieldID = item.el.data('validation-compare-field'),
                            field = $(document.getElementById(fieldID));

                        return (field.val() === value) && value.length >= 5;
                    }
                }
            };

            return self;
        };

        return {
            create: function(options) {
                var Validation = function() {},
                    instance;
                Validation.prototype = proto();

                instance = new Validation();
                instance.init(options);

                return {
                    showCustomMessage: instance.showCustomMessage,
                    showCustomError: instance.showCustomError,
                    clearErrors: instance.clearErrors,
                    destroy: instance.destroy
                };
            }
        };
    })();
});