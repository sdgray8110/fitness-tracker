var config = require('./models/config'),
    fs = require('fs'),
    path = require('path'),
    moment = require('moment-timezone');

var helpers = (function() {
    var self = {
        extend: function(defaults, options) {
            var extended = {};
            var prop;
            for (prop in defaults) {
                if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
                    extended[prop] = defaults[prop];
                }
            }
            for (prop in options) {
                if (Object.prototype.hasOwnProperty.call(options, prop)) {
                    extended[prop] = options[prop];
                }
            }
            return extended;
        },

        today: function() {
            var today = moment(),
                mountainTimeFormatted = today.tz('America/Denver').format('MM/DD/YYYY'),
                date = new Date(mountainTimeFormatted);

            return moment(date);
        },

        zeroPrefixInt: function(int) {
            var str = int + '';

            if (str.length < 2) {
                str = '0' + str;
            }

            return str;
        },

        capitalize: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        lowerCaseFirst: function(str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        },

        commify: function (nStr) {
            nStr += '';
            x = nStr.split('.');
            x1 = x[0];
            x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            return x1 + x2;
        },

        foodUnits: config.dataAccess.property('foodUnits'),

        monthName: function(date, short) {
            var month = typeof(date) === 'number' ? date - 1 : date.getMonth(),
                type = short ? 'abbr' : 'full',
                months = [
                    {full: 'January', abbr: 'Jan'},
                    {full: 'February', abbr: 'Feb'},
                    {full: 'March', abbr: 'Mar'},
                    {full: 'April', abbr: 'Apr'},
                    {full: 'May', abbr: 'May'},
                    {full: 'June', abbr: 'June'},
                    {full: 'July', abbr: 'July'},
                    {full: 'August', abbr: 'Aug'},
                    {full: 'September', abbr: 'Sept'},
                    {full: 'October', abbr: 'Oct'},
                    {full: 'November', abbr: 'Nov'},
                    {full: 'December', abbr: 'Dec'}
                ];

            return months[month][type];
        },

        dirTree: function(filename) {
            var stats = fs.lstatSync(filename),
                folders = [];

            if (stats.isDirectory()) {
                var children = fs.readdirSync(filename).map(function(child) {
                    return self.dirTree(filename + '/' + child);
                });

                folders.push(filename);
                folders.push(children);
            }

            return folders;
        },

        folderStructure: function(filename) {
            var folders = [],
                structure = self.dirTree(filename),
                flattened = structure.reduce(function(a, b) {
                    return a.concat(b);
                }).split(',').forEach(function(item) {
                    if (item !== '') {
                        item = item.replace(filename, '');

                        folders.push(item);
                    }
                });

            return folders;
        },

        isFutureDate: function(req, prependPath) {
            var date = moment(req.params.month + '/1/' + req.params.year),
                curMonth = moment().startOf('month'),
                initialRoute = prependPath ? '/' + prependPath : '';

            if (date.diff(curMonth, 'months') > 0) {
                var path = initialRoute + '/' + curMonth.format('YYYY') + '/' + curMonth.format('MM');

                return path;
            }

            return false;
        },

        sum: function(data, key) {
            var total = data[key].reduce(function(a, b) {
                return (a * 1) + (b * 1);
            });

            return total;
        },

        linkify: function(inputText) {
            var replacedText, replacePattern1, replacePattern2, replacePattern3;

            //URLs starting with http://, https://, or ftp://
            replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            replacedText = inputText.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

            //URLs starting with "www." (without // before it, or it'd re-link the ones done above).
            replacePattern2 = /(^|[^\/])(www\.[\S]+(\b|$))/gim;
            replacedText = replacedText.replace(replacePattern2, '$1<a href="http://$2" target="_blank">$2</a>');

            //Change email addresses to mailto:: links.
            replacePattern3 = /(([a-zA-Z0-9\-\_\.])+@[a-zA-Z\_]+?(\.[a-zA-Z]{2,6})+)/gim;
            replacedText = replacedText.replace(replacePattern3, '<a href="mailto:$1">$1</a>');

            return replacedText;
        },

        max: function(data, key) {
            return Math.max.apply(Math, data[key]);
        },

        formatDecimal: function(val, floatLen) {
            floatLen = typeof(floatLen) === 'undefined' ? 2 : floatLen;
            
            return {
                formatted: self.commify(val.toFixed(floatLen)),
                raw: val
            }
        },

        formatDecimals: function(activity, properties) {
            properties.forEach(function(property) {
                activity[property] = self.formatDecimal(activity[property]);
            });
        },

        formatContent: function(activity) {
            activity.formattedContent = self.linkify(activity.description);
            activity.formattedContent = activity.formattedContent.replace(/(?:\r\n|\r|\n)/g, '<br />');
        },

        formattedDate: function(activity, returnVal) {
            var dateObject = {
                formatted: moment(activity.date).format('MM/DD/YYYY'),
                raw: activity.date
            };

            if (typeof(returnVal) !== 'undefined') {
                return dateObject;
            }

            activity.date = dateObject;
        },

        formattedDuration: function(activity, returnVal) {
            var durationObject = {
                formatted: (function() {
                    var duration = activity.duration,
                        seconds = duration % 60,
                        minutes = ((duration - seconds) / 60) % 60,
                        hours = ((duration - seconds) - (minutes * 60)) / 3600,
                        time = [helpers.zeroPrefixInt(hours), helpers.zeroPrefixInt(minutes), helpers.zeroPrefixInt(parseInt(seconds))];

                    return time.join(':');
                })(),
                raw: activity.duration,
                hours: activity.duration / 3600
            };

            if (typeof(returnVal) !== 'undefined') {
                return durationObject;
            }

            activity.duration = durationObject;
        },

        formattedCalories: function(activity) {
            activity.calories = 0;

            if (typeof(activity.kj) !== 'undefined') {
                activity.kj = parseInt(activity.kj);
                activity.calories = self.kjToCalories(activity.kj);
            }
        },

        constructDateString: function(req) {
            if (req.params && req.params.month) {
                return req.params.month + '/1/' + req.params.year;
            }

            var today = helpers.today(),
                month = today.format('M'),
                year = today.format('YYYY');

            return month + '/1/' + year;
        },

        nonUniqueArrayItems: function (arr) {
            var i,
                len=arr.length,
                out=[],
                obj={};

            for (i=0;i<len;i++) {
                obj[arr[i]]=0;
            }
            for (i in obj) {
                out.push(i);
            }
            return out;
        },

        formattedType: function(activity) {
            activity.typeName = config.getActivityTypeName(activity.type);
        },

        kjToCalories: function(kj) {
            var kj = parseInt(kj);

            return parseInt((kj *.233) / .22);
        },
        
        dupeArray: function (arr1, arr2) {
            return arr1.toString() === arr2.toString();
        },

        processActivityPost: function(activity) {
            var metrics = config.activityMetrics(activity);

            metrics.forEach(function(metric) {
                var key = self.lowerCaseFirst(metric);

                self['activity' + metric](activity);
            });

            if (typeof(activity.average_power) !== 'undefined') {
                self.activityPower(activity);
            }

            return activity;
        },

        activityDate: function(activity) {
            activity.date = moment(activity.date).toDate();
        },

        activityDuration: function(activity) {
            var time = activity.duration.split(':');

            activity.duration = (parseInt(time[0]) * 3600) + (parseInt(time[1] * 60)) + parseInt(time[2]);
        },

        activityDistance: function(activity) {
            activity.distance = activity.distance * 1;
        },

        activityClimbing: function(activity) {
            var multiplier = activity.meters ? 3.28084 : 1;

            activity.climbing = parseInt(parseInt(activity.climbing.replace(/,/g, '')) * multiplier);
        },

        activityHours: function(activity) {
            activity.hours = activity.duration / 3600;
        },

        activityAverageSpeed: function(activity) {
            activity.average_speed = activity.distance / activity.hours;
        },

        activityVAM: function(activity) {
            activity.vam = activity.climbing / activity.distance;
        },

        activityClimbingRate: function(activity) {
            activity.climbing_rate = activity.climbing / activity.hours;
        },

        activityPower: function(activity) {
            var types = ['average', 'normalized', 'max'];
            activity.power = {};

            types.forEach(function(type) {
                var key = type + '_power';
                activity.power[key] = activity[key];
                delete(activity[key]);
            });
        },

        isLocal: function(req) {
            return req.headers.host === 'localhost:3000';
        },

        processTabs: function(date) {
            var now = moment(),
                selectedMonth = parseInt(date.format('M')),
                currentMonth = date.year() === now.year() ? parseInt(moment().format('M')) : 12,
                year = parseInt(date.format('YYYY')),
                month = currentMonth,
                months = [];


            while (month > 0) {
                var model = {
                    month: month,
                    year: year,
                    name: self.monthName(month),
                    className: month === selectedMonth ? 'active' : null
                };

                months.push(model);

                month -= 1;
            };

            return months.reverse();
        }

    };

    return self;
})();

module.exports = helpers;