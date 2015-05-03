var moment = require('moment-timezone'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID;

var RideCollection = (function() {
    var self = {
        processRide: function(ride, i) {
            helpers.formattedDate(ride);
            helpers.formattedDuration(ride);
            helpers.formatDecimals(ride, ['distance', 'average_speed', 'vam', 'climbing_rate']);
            self.uiModel(ride, i);
            ride.climbing = helpers.formatDecimal(ride.climbing, 0);
        },

        processCollection: function(rides) {
            rides.forEach(self.processRide);

            return rides;
        },

        processTabs: function(date) {
            var now = helpers.today(),
                selectedMonth = parseInt(date.format('M')),
                currentMonth = date.year() === now.year() ? parseInt(now.format('M')) : 12,
                year = parseInt(date.format('YYYY')),
                month = currentMonth,
                months = [];

            while (month > 0) {
                var model = {
                    month: month,
                    year: year,
                    name: helpers.monthName(month),
                    className: month === selectedMonth ? 'active' : null
                };

                months.push(model);

                month -= 1;
            };

            return months.reverse();
        },

        processMeta: function(data) {
            return {title: data.title + ' | ' + data.displayMonth}
        },

        processContent: function(data) {
            return data;
        },

        uiModel: function(ride, i) {
            ride.ui = {
                className: i % 2 === 0 ? 'even' : 'odd'
            };
        },

        aggregateRawData: function(rides) {
            var data = self.rawDataStructure(rides);

            rides.forEach(function(ride) {
                self.aggregateRideData(ride, data);
            });

            return data;
        },

        rawDataStructure: function(rides) {
            var fields = ['distance', 'duration', 'climbing', 'average_speed', 'vam', 'climbing_rate'],
                data = {};

            fields.forEach(function(key) {
                if (rides.length) {
                    data[key] = [];
                } else {
                    data[key] = [0];
                }
            });

            return data;
        },

        aggregateRideData: function(ride, data) {
            var fields = Object.keys(data);

            fields.forEach(function(key) {
                var val = typeof(ride[key].raw) !== 'undefined' ? ride[key].raw : ride[key];

                data[key].push(val);
            });
        },

        processStats: function(rides) {
            var data = self.aggregateRawData(rides),
                stats = {
                    totals: self.totals(data),
                    maximums: self.maximums(data)
                };

            stats.averages = self.averages(data, stats.totals);

            return stats;
        },

        totals: function(data) {
            var distance = helpers.sum(data, 'distance'),
                duration = helpers.sum(data, 'duration'),
                climbing = helpers.sum(data, 'climbing')

            return {
                distance: helpers.formatDecimal(distance),
                duration: helpers.formattedDuration({duration: duration}, true),
                climbing: helpers.formatDecimal(climbing, 0)
            }
        },

        maximums: function(data) {
            var distance = helpers.max(data, 'distance'),
                duration = helpers.max(data, 'duration'),
                climbing = helpers.max(data, 'climbing'),
                average_speed = helpers.max(data, 'average_speed'),
                vam = helpers.max(data, 'vam'),
                climbing_rate = helpers.max(data, 'climbing_rate');

            return {
                distance: helpers.formatDecimal(distance),
                duration: helpers.formattedDuration({duration: duration}, true),
                climbing: helpers.formatDecimal(climbing, 0),
                average_speed: helpers.formatDecimal(average_speed),
                vam: helpers.formatDecimal(vam),
                climbing_rate: helpers.formatDecimal(climbing_rate)
            }
        },

        averages: function(data, totals) {
            var len = data.distance.length,
                distance = totals.distance.raw / len,
                duration = totals.duration.raw / len,
                climbing = totals.climbing.raw / len,
                average_speed = totals.distance.raw / totals.duration.hours,
                vam = totals.climbing.raw / totals.distance.raw,
                climbing_rate = totals.climbing.raw / totals.duration.hours;

            return {
                distance: helpers.formatDecimal(distance),
                duration: helpers.formattedDuration({duration: duration}, true),
                climbing: helpers.formatDecimal(climbing, 0),
                average_speed: helpers.formatDecimal(average_speed),
                vam: helpers.formatDecimal(vam),
                climbing_rate: helpers.formatDecimal(climbing_rate)
            }
        },

        dataAccess: {
            /* GET */
            fetchAll: function(req, res, callback) {
                var db = req.db;

                db.collection('rides').find({}).toArray(function(err, rides) {
                    callback(rides)
                });
            },

            fetchRideByID: function(req, res, callback) {
                var db = req.db;

                db.collection('rides').find({'_id': new ObjectID(req.params.id)}).toArray(function(err, rides) {
                    callback(self.processCollection(rides));
                });
            },

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

                db.collection('rides').find({date: dateRange}).sort({date: 1}).toArray(function(err, rides) {
                    var fieldAssociation = {
                        rides: {method: 'processCollection', data: rides},
                        stats: {method: 'processStats', data: rides},
                        tabs: {method: 'processTabs', data: dateObj},
                        meta: {method: 'processMeta', data: {title: req.title, displayMonth: displayMonth}},
                        content: {method: 'processContent', data: content}
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

            fetchCurrentWeekStats: function(req, callback) {
                var db = req.db,
                    startOfWeek = moment().startOf('isoweek'),
                    dateRange = {'$gte': startOfWeek.toDate(), '$lt': moment().toDate()};

                db.collection('rides').find({date: dateRange}).sort({date: 1}).toArray(function(err, rides) {
                    var weeklyStats = self.processStats(rides);

                    callback(weeklyStats);
                });
            },

            fetchYear: function(req, res, callback) {
                var db = req.db,
                    dateStr = helpers.constructDateString(req),
                    dateRange = {'$gte': moment(dateStr).startOf('year').toDate(), '$lt': moment(dateStr).endOf('year').toDate()},
                    model = {
                        year: {
                            year: moment(dateStr).format('YYYY')
                        }
                    };

                db.collection('rides').find({date: dateRange}).toArray(function(err, rides) {
                    var fieldAssociation = {
                        stats: {method: 'processStats', data: rides}
                    };

                    req.fields.forEach(function(field) {
                        var association = fieldAssociation[field];

                        model.year[field] = self[association.method](association.data);
                    });


                    self.dataAccess.fetchCurrentWeekStats(req, function(weeklyStats) {
                        model.year.weeklyStats = weeklyStats;

                        console.log(model);

                        callback(model);
                    });
                });
            },

            fetchCommonRides: function(req, res, callback) {
                var db = req.db;

                db.collection('rides').find().sort({ride_name: 1}).toArray(function(err, rides) {
                    var rideNames = {},
                        keys = [],
                        commonRides = [],
                        excludes = ['Imported Ride'];

                    rides.forEach(function(ride) {
                        if (excludes.indexOf(ride.ride_name) >= 0) {
                            return;
                        } else if (typeof(rideNames[ride.ride_name]) === 'undefined') {
                            rideNames[ride.ride_name] = 1;
                        } else if (keys.indexOf(ride.ride_name) < 0 && rideNames[ride.ride_name] >= 10) {
                            var index = keys.length;

                            rideNames[ride.ride_name] += 1;
                            keys.push(ride.ride_name);

                            ride.date = helpers.today();
                            ride.index = index;

                            commonRides.push(ride);
                        } else {
                            rideNames[ride.ride_name] += 1;
                        }
                    });

                    callback(self.processCollection(commonRides));
                });
            },

            fetchYearList: function(req, res, options, callback) {
                var db = req.db;

                db.collection('rides').aggregate([{'$group': {_id: {year: {'$year': '$date'}}}},{'$sort' : {'_id.year' : -1}}], function(err, years) {
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
            postNewRide: function(req, res, callback) {
                var db = req.db,
                    ride = helpers.processActivityPost(req.body);
                delete(ride.rideID);

                db.collection('rides').insert(ride, function(err, result) {
                    var newRide = result[0]  ;
                    self.processRide(newRide, 0);

                    callback(newRide);
                });
            },

            updateRide: function(req, res, callback) {
                var db = req.db,
                    ride = helpers.processActivityPost(req.body),
                    id = ride.rideID;
                delete(ride.rideID);

                db.collection('rides').update({'_id': new ObjectID(id)}, ride, {safe: true}, function(err, result) {
                    self.processRide(ride, 0);
                    ride.rideID = id;
                    ride._id = id;

                    callback(ride);
                });
            },

            deleteRide: function(req, res, callback) {
                var db = req.db,
                    ride = helpers.processActivityPost(req.body),
                    id = ride.rideID;

                db.collection('rides').remove({'_id': new ObjectID(id)}, {justOne: true}, function(err, result) {
                    ride.message = 'Ride ' + id + ' successfully removed';

                    callback(ride);
                });
            }
        }
    };

    return self;
})();

module.exports = RideCollection;