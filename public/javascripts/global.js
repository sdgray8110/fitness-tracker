define('global', function(require) {
    'use strict';

    var helpers = require('helpers');

    return (function() {
        var self = {
            cacheDom: function() {
                self.dom = {};
                self.dom.window = $(window);
                self.dom.body = $(document.body);
            },

            init: function() {
                self.loadComponents();
                self.cacheDom();
            },

            loadComponents: function() {
                var components = document.getElementsByClassName('js_components'),
                    len = components.length,
                    names = [];

                if (len) {
                    for (var i = 0; i < len; i++) {
                        var str = components[i].innerHTML,
                            scripts = str.split(','),
                            sLen = scripts.length;

                        for (var x = 0; x < sLen; x++) {
                            var script = scripts[x].trim(),
                                path = helpers.settings.componentsPath + script + '.js';

                            if (names.indexOf(path) < 0) {
                                names.push(path);
                            }
                        }
                    }

                    return require(names);
                }
            }
        };

        return self;
    })();
});