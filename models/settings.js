var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID,
    AppConfig = require('../models/config'),
    settingsCollection = (function() {
        var self = {
            dataAccess: {
                fetchSettings: function (req, res, callback) {
                    var db = req.db,
                        model = {};

                    db.collection('settings').find().toArray(function(err, settings) {
                        model = helpers.extend(model, {settings: settings[0]});
                        callback(model);
                    });
                },

                get: function(req, res, callback) {
                    var db = req.db;

                    var model = {};
                    AppConfig.dataAccess.formConfig(function (config) {
                        model.fields = config.formFields.settings;
                        model.action = '/api/settings';

                        db.collection('settings').find().toArray(function(err, settings) {
                            self.model = helpers.extend(model, {settings: settings[0]});
                            callback(self.model);
                        });
                    });
                },

                postSettings: function(req, res, callback) {
                    var db = req.db,
                        settings = req.body,
                        id = settings.settingsID;

                    delete(settings.settingsID);

                    db.collection('settings').update({'_id': new ObjectID(id)}, settings, {safe: true}, function(err, result) {
                        db.collection('settings').find().toArray(function(err, update) {
                            update = update[0];
                            update.message = 'Settings have successfully been updated';

                            callback(update);
                        });
                    });
                },
            }

        };

        return self;
    })();

module.exports = settingsCollection;