define(function(require) {
    'use strict';

    var self = {
        settings: (function() {
            var settings = {};
            settings.javascriptPath = '/javascripts/';
            settings.componentsPath = settings.javascriptPath + 'components/';

            return settings;
        })(),

        cacheDom: function() {
            self.dom = {};
            self.dom.body = $(document.body);
            self.dom.topLevel = $('html, body');
        },

        init: function() {
            self.cacheDom();

            return self;
        },

        debounce: function(func, wait, immediate) {
            var timeout, args, context, timestamp, result;

            var later = function() {
                var last = self.now() - timestamp;

                if (last < wait && last >= 0) {
                    timeout = setTimeout(later, wait - last);
                } else {
                    timeout = null;
                    if (!immediate) {
                        result = func.apply(context, args);
                        if (!timeout) context = args = null;
                    }
                }
            };

            return function() {
                context = this;
                args = arguments;
                timestamp = self.now();
                var callNow = immediate && !timeout;
                if (!timeout) timeout = setTimeout(later, wait);
                if (callNow) {
                    result = func.apply(context, args);
                    context = args = null;
                }

                return result;
            };
        },


        now:Date.now || function() {
            return new Date().getTime();
        },

        selectFoodUnit: function (food) {
            food.serving_size_types = helpers.foodUnits();

            food.food_serving_size = food.food_serving_size || 1;
            food.serving_size_type = food.serving_size_type || 'cup';

            food.serving_size_types.forEach(function (type) {
                if (food.serving_size_type === type.value)
                    food.serving_size_applied = (food.food_serving_size * 1) === 1 ? type.singular : type.plural;
                    type.selected = true;
            });
        },

        parsePageDataJSON: function(el) {
            return JSON.parse(el.text().trim());
        },

        capitalize: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        initialCaps: function(str) {
            var arr = str.split(' ');

            for (var i = 0; i < arr.length; i++) {
                arr[i] = self.capitalize(arr[i]);
            }

            return arr.join(' ');
        },

        scrollToElement: function(el, padding) {
            var topOffset = el.offset().top;
            padding = padding || 0;

            self.dom.topLevel.animate({scrollTop: topOffset - padding}, 300);
        },

        yAxisScrollOffset: function () {
            return (window.pageYOffset !== undefined) ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop;
        },

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

        relativeProtocol: function(url) {
            var arr = url.split('://');

            return '//' + arr[arr.length - 1];
        },

        baseUrl: function(){
            return window.location.href.substring(0, window.location.href.indexOf("?"));
        },

        cacheBust: function() {
            return '?t=' + (new Date() * 1);
        },

        activityHelpers: function(activity) {
            var helper = {};
            helper.activityDate = moment(activity.date.raw);
            helper.month = helper.activityDate.format('YYYY/MM');
            helper.year = helper.activityDate.format('YYYY');
            helper.cacheBust = self.cacheBust();

            return helper;
        }
    };

    return self.init();
});