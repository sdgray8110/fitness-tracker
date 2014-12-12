/* In The Neighborhood Component  */

define(function(require) {
    'use strict';

    var helpers = require('helpers'),
        _d3,
        _nv;

    require(['d3'], function(d3){
        window.d3 = _d3 = d3;

        require(['nvd3'], function() {
            _nv = window.nv;

            return graphs();
        });
    });

    var graphs = function () {
        var self = {
            init: function() {
                require(['json!/api/graph/monthly-totals'], self.render);
            },

            render: function(data) {
                self.currentMonths(data);
                self.currentDays(data.allRides);
                self.rideBreakdown(data.allRides);
            },

            currentMonths: function(data) {
                _nv.addGraph(function() {
                    var chart = _nv.models.discreteBarChart()
                            .x(function(d) { return d.label })    //Specify the data accessors.
                            .y(function(d) { return d.value })
                            .staggerLabels(false)    //Too many bars and not enough room? Try staggering labels.
                            .tooltips(true)        //Don't show tooltips
                            .showValues(true)       //...instead, show the bar value right on top of each bar.
                            .transitionDuration(350);

                    d3.select('#chart svg')
                        .datum([self.processData(data)])
                        .call(chart);

                    _nv.utils.windowResize(chart.update);

                    return chart;
                });
            },

            currentDays: function(data) {
                _nv.addGraph(function() {
                    var chart = _nv.models.discreteBarChart()
                            .x(function(d) { return d.index; })    //Specify the data accessors.
                            .y(function(d) { return d.value })
                            .staggerLabels(false)    //Too many bars and not enough room? Try staggering labels.
                            .tooltips(true)        //Don't show tooltips
                            .showValues(false)       //...instead, show the bar value right on top of each bar.
                            .transitionDuration(350);

                    d3.select('#days_chart svg')
                        .datum([self.processDailyRides(data)])
                        .call(chart);

                    _nv.utils.windowResize(chart.update);

                    return chart;
                });
            },

            rideBreakdown: function(data) {
                nv.addGraph(function() {
                    var chart = nv.models.pieChart()
                        .x(function(d) { return d.label })
                        .y(function(d) { return d.value })
                        .showLabels(true)
                        .tooltipContent(self.breakdownTooltip);

                    d3.select("#pie svg")
                        .datum(self.processBreakdown(data))
                        .transition().duration(350)
                        .call(chart);

                    return chart;
                });
            },

            processData: function(data) {
                var rides = data.allRides['2014'],
                    keys = Object.keys(rides.months),
                    vals = [];

                keys.forEach(function(key) {
                    data = {
                        label: helpers.monthName(parseInt(key), true),
                        value: rides.months[key] - 0
                    };

                    vals.push(data)
                });

                var res = {
                    key: '2014 Monthly Ride Totals',
                    values: vals
                };

                return res;
            },

            processDailyRides: function(data) {
                var rides = data.dailyRides['2014'],
                    vals = [];

                rides.forEach(function(ride, i) {
                    vals.push({
                        value: ride,
                        index: i,
                        label: null
                    });
                });

                var res = {
                    key: '2014 Daily Rides',
                    values: vals
                };

                return res;
            },

            processBreakdown: function(data) {
                var breakdown = data.breakdown['2014'],
                    keys = Object.keys(breakdown),
                    prev = 0,
                    vals = [];

                keys.forEach(function(key) {
                    var item = {};
                    item.value = breakdown[key] * 1;
                    item.label = prev + ' - ' + key + ' miles'

                    if (isNaN(key)) {
                        item.label = 'Over 100 miles';
                    }

                    prev = key;
                    vals.push(item);
                });

                return vals;
            },

            breakdownTooltip: function(key, x, y, e, graph) {
                var val = parseInt(y.value) + ' rides',
                    header = '<h3>' + key + '</h3>',
                    body = '<p>' + val + '</p>';

                return [header,body].join('');
            }
        };

        return self.init();
    };
});