var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID,
    AppConfig = require('../models/config'),
    settingsCollection = (function() {
        var self = {
            dataAccess: {
                get: function(req, res, callback) {
                    var db = req.db,
                        model = {};

                    callback(model);
                }
            }

        };

        return self;
    })();

module.exports = settingsCollection;