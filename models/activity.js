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
            helpers.formattedType(activity);
            helpers.formattedDate(activity);
            helpers.formattedDuration(activity);
            helpers.formattedCalories(activity);
            self.uiModel(activity, i);
        },

        processMeta: function(data) {
            return {title: data.title + ' | ' + 'Activity'}
        },

        processContent: function(data) {
            return data;
        },

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
                            meta: {method: 'processMeta', data: {title: req.title, displayMonth: displayMonth}},
                            content: {method: 'processContent', data: content}
                        };

                    req.fields.forEach(function(field) {
                        var association = fieldAssociation[field];

                        model[field] = self[association.method](association.data);
                    });

                    callback(model);
                });
            },

            fetchActivityByID: function(req, res, callback) {
                var db = req.db;

                db.collection('activities').find({'_id': new ObjectID(req.params.id)}).toArray(function(err, activities) {
                    callback(self.processActivities(activities));
                });
            },

            /* POST */
            postNewActivity: function(req, res, callback) {
                var db = req.db,
                    activity = helpers.processActivityPost(req.body);
                delete(activity.activityID);

                db.collection('activities').insert(activity, function(err, result) {
                    var newActivity = result[0]  ;
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