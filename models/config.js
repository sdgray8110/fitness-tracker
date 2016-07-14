var AppConfig = require('../app.config.json');

var Config = (function() {
    var self = {

        setFieldTypes: function(types) {
            var keys = Object.keys(types),
                fields = {};

            keys.forEach(function(key) {
                fields[key] = {};

                types[key].forEach(function(type) {
                    fields[key][type + 'Field']  = 1;
                });
            });

            return fields;
        },

        setActivityTypes: function() {
            var activityTypes = AppConfig.activityTypes;

            activityTypes.forEach(function(item, i) {
                item.index = i;
            });

            return activityTypes;
        },

        setHealthTypes: function() {
            var healthTypes = AppConfig.healthTypes;

            healthTypes.forEach(function(item, i) {
                item.index = i;
            });

            return healthTypes;
        },

        getActivityTypeName: function(type) {
            var name = type;

            self.setActivityTypes().forEach(function(activityType) {
                if (type === activityType.type) {
                    name = activityType.name;
                    return;
                }
            });

            return name;
        },

        activityMetrics: function(activity) {
            var type = typeof(activity.type) !== 'undefined' ? activity.type : 'ride';

            return AppConfig.metrics[type];
        },

        dataAccess: {
            config: function(callback) {
                callback(AppConfig);
            },

            formConfig: function(callback) {
                callback({
                    formFields: self.setFieldTypes(AppConfig.formFields),
                    activityTypes: self.setActivityTypes(),
                    healthTypes: self.setHealthTypes()
                });
            },

            property: function (prop) {
                return AppConfig[prop];

            },

            healthTypeName: function (type) {
                var name = '';

                AppConfig.healthTypes.forEach(function (item) {
                    if (type === item.type) {
                        name = item.name;
                    }
                })

                return name;
            }
        }
    };

    return self;
})();

module.exports = Config;
