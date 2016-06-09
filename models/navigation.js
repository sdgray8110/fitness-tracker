var AppConfig = require('../models/config'),
    Navigation = (function() {
    var self = {
            construct: function(selectedItem) {
                var navStructure = AppConfig.dataAccess.property('navigation'),
                    header = Object.keys(navStructure.header),
                    footer = Object.keys(navStructure.footer),
                    model = {
                        header: header.map(function(key, i) {
                            var item = navStructure.header[key];
                            item.active = key === selectedItem;

                            return item;
                        }),
                        footer: footer.map(function(key, i) {
                            var item = navStructure.footer[key];
                            item.active = key === selectedItem;

                            return item;
                        })
                    };


                return model;
            }
        };

    return self;
})();

module.exports = Navigation;