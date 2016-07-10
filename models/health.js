var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID,
    AppConfig = require('../models/config'),
    HealthCollection = (function() {
        var self = {
            processMeta: function(data) {
                return {title: data.title + ' | ' + 'Health'}
            },

            dataAccess: {
                fetch: function(req, res, callback) {
                    var db = req.db,
                        dateStr = helpers.constructDateString(req),
                        dateObj = moment(dateStr),
                        selectedYear = dateObj.format('YYYY'),
                        selectedMonth = dateObj.format('MM'),
                        displayMonth = dateObj.format('MMMM YYYY'),
                        dateRange = {'$gte': moment(dateStr).startOf('month').toDate(), '$lt': moment(dateStr).endOf('month').toDate()},
                        content = {displayMonth: displayMonth, dateString: dateStr},
                        foodlist = [],
                        fieldAssociation = {
                            content: {method: 'processContent', data: content},
                            tabs: {method: 'processTabs', data: dateObj}
                        },
                        model = {};

                    req.fields = Object.keys(fieldAssociation);

                    req.fields.forEach(function(field) {
                        var association = fieldAssociation[field];

                        model[field] = self[association.method](association.data);
                    });

                    db.collection('health').find({date: dateRange}).sort({date: 1}).toArray(function(err, health) {
                        model.health = self.processHealth(health);

                        callback(model);
                    });
                },

                saveHealthEntry: function(req, res, callback) {
                    var db = req.db,
                        health = req.body;

                    health.date = moment(health.date).toDate();

                    db.collection('health').insert(health, function(err, result) {
                        var health = result.ops[0];

                        db.collection('health').find().toArray(function(err, health) {
                            health = self.processHealth(health);

                            callback(health);
                        });
                    });
                },

                editHealthEntry: function(req, res, callback) {
                    var db = req.db,
                        model = req.body,
                        id = model.activityID;

                    model.date = moment(model.date).toDate();

                    delete(model.activityID);

                    db.collection('health').update({'_id': new ObjectID(id)}, model, {safe: true}, function(err, result) {
                        db.collection('health').find().toArray(function(err, health) {
                            callback(health);
                        });
                    });
                }
            },

            uiModel: function(day, i) {
                day.ui = {
                    className: i % 2 === 0 ? 'even' : 'odd'
                };
            },

            processHealth: function (health) {
                var healthConfig = AppConfig.setHealthTypes();

                health.forEach(function (item, i ) {
                    self.setItemValue(item, healthConfig);

                    self.uiModel(item, i);
                });

                return health;
            },

            setItemValue: function (item, healthConfig) {
                item.value = item[item.type];
                item.type = AppConfig.dataAccess.healthTypeName(item.type);
                item.date = {
                    formatted: moment(item.date).format('MM/DD/YYYY'),
                    raw: item.date
                };

                var duplicate = helpers.extend({}, item);
                duplicate.date = {
                        formatted: moment().format('MM/DD/YYYY'),
                        raw: moment().toDate()
                    };

                delete(duplicate._id);

                item.duplicate = JSON.stringify(duplicate);
                item.encoded = JSON.stringify(item);
            },

            processContent: function(data) {
                return data;
            },

            processTabs: helpers.processTabs
        };

        return self;
    })();

module.exports = HealthCollection;