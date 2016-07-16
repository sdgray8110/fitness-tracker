var moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID;

var ActivityCollection = (function() {
    var self = {
        processActivities: function(activities) {
            activities.forEach(self.processActivity);

            return activities;
        },

        processActivity: function(activity, i) {
            var activityPipeline = ['formattedType', 'formattedDate', 'formattedDuration', 'formattedCalories', 'formatContent'];

            activityPipeline.forEach(function (func) {
                helpers[func](activity);
            });

            self.uiModel(activity, i);
        },
        processContent: function(data) {
            return data;
        },

        processTabs: helpers.processTabs,

        uiModel: function(activity, i) {
            activity.ui = {
                className: i % 2 === 0 ? 'even' : 'odd'
            };
        },

        dataAccess: {
            fetchMonth: function(req, res, callback) {
                var db = req.db,
                    dateStr = helpers.constructDateString(req),
                    dateObj = moment(dateStr),
                    selectedYear = dateObj.format('YYYY'),
                    selectedMonth = dateObj.format('MM'),
                    displayMonth = dateObj.format('MMMM YYYY'),
                    dateRange = {'$gte': moment(dateStr).startOf('month').toDate(), '$lt': moment(dateStr).endOf('month').toDate()},
                    content = {displayMonth: displayMonth, dateString: dateStr},
                    model = {};

                db.collection('activities').find({date: dateRange}).sort({date: 1}).toArray(function(err, activities) {
                    var fieldAssociation = {
                            activities: {method: 'processActivities', data: activities},
                            content: {method: 'processContent', data: content},
                            tabs: {method: 'processTabs', data: dateObj}
                        };

                    req.fields.forEach(function(field) {
                        var association = fieldAssociation[field];

                        model[field] = self[association.method](association.data);
                    });

                    self.dataAccess.fetchYearList(req, res, {selectedYear: selectedYear, selectedMonth: selectedMonth}, function(years) {
                        model.yearList = {years: years};

                        callback(model);
                    });
                });
            },

            fetchActivityByID: function(req, res, callback) {
                var db = req.db;

                db.collection('activities').find({'_id': new ObjectID(req.params.id)}).toArray(function(err, activities) {
                    callback(self.processActivities(activities));
                });
            },

            fetchYearList: function(req, res, options, callback) {
                var db = req.db;

                db.collection('activities').aggregate([{'$group': {_id: {year: {'$year': '$date'}}}},{'$sort' : {'_id.year' : -1}}], function(err, years) {
                    for (var i = 0; i < years.length; i ++) {
                        years[i] = years[i]._id;

                        if (options.selectedYear) {
                            years[i].selected = parseInt(options.selectedYear) === parseInt(years[i].year);
                        }

                        if (options.selectedMonth) {
                            years[i].month = options.selectedMonth;
                        }
                    }

                    callback(years);
                });
            },

            /* POST */
            postNewActivity: function(req, res, callback) {
                var db = req.db,
                    activity = helpers.processActivityPost(req.body);
                delete(activity.activityID);

                db.collection('activities').insert(activity, function(err, result) {
                    var newActivity = result.ops[0]  ;
                    self.processActivity(newActivity, 0);

                    callback(newActivity);
                });
            },

            updateActivity: function(req, res, callback) {
                var db = req.db,
                    activity = helpers.processActivityPost(req.body),
                    id = activity.activityID;
                delete(activity.activityID);

                db.collection('activities').update({'_id': new ObjectID(id)}, activity, {safe: true}, function(err, result) {
                    self.processActivity(activity, 0);
                    activity.activityID = id;
                    activity._id = id;

                    callback(activity);
                });
            },

            deleteActivity: function(req, res, callback) {
                var db = req.db,
                    activity = helpers.processActivityPost(req.body),
                    id = activity.activityID;

                db.collection('activities').remove({'_id': new ObjectID(id)}, {justOne: true}, function(err, result) {
                    activity.message = 'Activity ' + id + ' successfully removed';

                    callback(activity);
                });
            }
        }
    };

    return self;
})();

module.exports = ActivityCollection;