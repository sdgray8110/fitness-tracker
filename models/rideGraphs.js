var RideCollection = require('./rides'),
    moment = require('moment'),
    helpers = require('../helpers'),
    ObjectID = require('mongoskin').ObjectID;

var RideGraphs = (function() {
    var self = {
            processMonthlyTotals: function(totals) {
                var data = {
                    years: [],
                    yearlyRides: {},
                    monthlyRides: {},
                    dailyRides: {},
                    totals: {},
                    breakdown: {}
                };

                totals.forEach(function(ride, i) {
                    var rideDate = new Date(ride.date),
                        year = rideDate.getFullYear(),
                        month = rideDate.getMonth() + 1,
                        day = moment(rideDate).startOf('day').unix();

                    (function() {
                        if (typeof(data.yearlyRides[year]) === 'undefined') {
                            data.years[year] = {year: year, months: []};
                            data.monthlyRides[year] = {};
                            data.yearlyRides[year] = [];
                        }
                    })();

                    (function() {
                        if (typeof(data.monthlyRides[year][month]) === 'undefined') {
                            data.monthlyRides[year][month] = [];
                            data.years[year].months.push(month);
                        }
                    })();

                    (function() {
                        if (typeof(data.dailyRides[year]) === 'undefined') {
                            data.dailyRides[year] = {
                                days: [],
                                rides: []
                            };
                        }

                        var ridePos = data.dailyRides[year].rides.length - 1,
                            dayPos = data.dailyRides[year].days.length - 1;

                        if (data.dailyRides[year].days[dayPos] === day) {
                            data.dailyRides[year].rides[ridePos] += (ride.distance * 1);
                        } else {
                            data.dailyRides[year].rides.push(ride.distance * 1);
                            data.dailyRides[year].days.push(day);
                        }
                    })();

                    (function() {
                        var thresholds = [10,25,35,50,75,100],
                            len = thresholds.length;
                            excess = 'over100';

                        if (typeof(data.breakdown[year]) === 'undefined') {
                            data.breakdown[year] = {
                                10: 0, 25: 0, 35: 0, 50: 0, 75: 0, 100: 0, 'over100': 0
                            };
                        }

                        for (var i = 0; i < len; i++) {
                            if ((ride.distance * 1) < thresholds[i]) {
                                data.breakdown[year][thresholds[i]] += 1;
                                return;
                            } else if (i === (len - 1)) {
                                data.breakdown[year][excess] += 1;
                                return;
                            }
                        }
                    })();

                    data.monthlyRides[year][month].push(ride.distance);
                    data.yearlyRides[year].push(ride.distance);
                });

                data.years.forEach(function(year) {
                    data.totals[year.year] = {
                        total: helpers.sum(data.yearlyRides, year.year).toFixed(2),
                        months: self.monthlyTotals(data.monthlyRides[year.year], data.years[year.year].months)
                    };

                    data.dailyRides[year.year] = data.dailyRides[year.year].rides;
                });

                data.totals.dailyRides = data.dailyRides;
                data.totals.breakdown = data.breakdown;

                return data.totals;
            },

            monthlyTotals: function(year, months) {
                var monthlyTotals = {};

                months.forEach(function(month) {
                    monthlyTotals[month] = helpers.sum(year, month).toFixed(2);
                });

                return monthlyTotals;
            },

            dataAccess: {
                monthlyTotals: function(req, res, callback) {
                    var viewModel = {};

                    RideCollection.dataAccess.fetchAll(req, res, function(totals) {
                        viewModel.allRides = self.processMonthlyTotals(totals);

                        callback(viewModel);
                    });
                }
            }
        };

    return self;
})();

module.exports = RideGraphs;