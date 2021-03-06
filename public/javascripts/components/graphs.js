/* FITNESS TRACKER GRAPHS component */

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
                self.graphData = helpers.config.graphs;
            },

            render: function(data) {
                var renderPipeline = [
                    {method: 'currentMonths', data: data},
                    {method: 'currentDays', data: data.allRides},
                    {method: 'rideBreakdown', data: data.allRides},
                    {method: 'powerLineChart', data: data.allRides.power},
                    {method: 'weightLineChart', data: data.weight}
                ];

                renderPipeline.forEach(function (mapping) {
                    self[mapping.method](mapping.data);
                });
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
                            .x(function(d) { return d.index + 1; })    //Specify the data accessors.
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

            powerLineChart: function(data) {
                nv.addGraph(function() {
                    var chart = nv.models.lineChart()
                        .x(function(d) {return d.index + 1; })    //Specify the data accessors.
                        .y(function(d) { return d.value });

                    d3.select('#power_line svg')
                        .datum(self.processPowerData(data))
                        .call(chart);

                    nv.utils.windowResize(chart.update);

                    return chart;
                });
            },

            weightLineChart: function(data) {
                  nv.addGraph(function() {
                    var chart = nv.models.lineChart()
                        .x(function(d) { return d.index + 1; })    //Specify the data accessors.
                        .y(function(d) { return d.weight; })

                    d3.select('#weight_line svg')
                        .datum(data)
                        .call(chart);

                    nv.utils.windowResize(chart.update);

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
                        .call(chart);

                    return chart;
                });
            },

            processData: function(data) {
                var rides = data.allRides['2015'],
                    keys = Object.keys(rides.months),
                    vals = [];

                keys.forEach(function(key) {
                    data = {
                        label: helpers.monthName(parseInt(key), true),
                        value: rides.months[key] - 0
                    };

                    vals.push(data)
                });

                var res = $.extend({
                    values: vals
                }, self.graphData.monthlyTotals);

                return res;
            },

            processPowerData: function(data) {
                var x = 0,
                    len = data.values.length,
                    cumulativePower = 0,
                    averages = [],
                    res = null,
                    averageData = null;

                data.values.forEach(function(val, i) {
                    var value = $.extend({}, val);

                    cumulativePower += parseInt(value.value);

                    if (i == 0) {
                        averages.push(value);
                        cumulativePower = 0;
                    } else if (x == 6) {
                        value.value = cumulativePower / x;

                        averages.push(value);

                        x = 0;
                        cumulativePower = 0;
                    } else if ((i + 1) == len) {
                        value.value = cumulativePower / (x);
                        averages.push(value);
                    }

                    x += 1;
                });

                averageData = $.extend({
                    values: averages
                }, self.graphData.averages);

                data = $.extend({
                    values: data.values
                }, self.graphData.rideAverage);

                res = [averageData, data];

                return res;
            },

            processDailyRides: function(data) {
                var rides = data.dailyRides['2015'],
                    vals = [];

                rides.forEach(function(ride, i) {
                    vals.push({
                        value: ride,
                        index: i,
                        label: null
                    });
                });

                var res = $.extend({
                    values: vals
                }, self.graphData.dailyTotals);

                return res;
            },

            processBreakdown: function(data) {
                var breakdown = data.breakdown['2015'],
                    keys = Object.keys(breakdown),
                    prev = 0,
                    vals = [];

                keys.forEach(function(key) {
                    var item = {};
                    item.value = breakdown[key] * 1;
                    item.label = prev + ' - ' + key + ' miles'

                    if (isNaN(key)) {
                        item.label = helpers.config.graphExcess.label;
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
