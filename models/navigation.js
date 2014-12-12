var Navigation = (function() {
    var pages = {
            ride: {
                path: '/',
                title: 'Ride Logger',
                className: 'ride-logger'
            },
            activity: {
                path: '/activity',
                title: 'Activity Tracker',
                className: 'activity-tracker'
            },
            nutrition: {
                path: '/nutrition',
                title: 'Nutrition',
                className: 'nutrition-tracker'
            },
            health: {
                path: '/health',
                title: 'Health',
                className: 'health-tracker'
            }
        },
        self = {
            construct: function(selectedItem) {
                var keys = Object.keys(pages),
                    model = [];

                keys.forEach(function(key, i) {
                    var item = pages[key];
                    item.active = key === selectedItem;

                    model.push(item);
                });

                return model;
            }
        };

    return self;
})();

module.exports = Navigation;