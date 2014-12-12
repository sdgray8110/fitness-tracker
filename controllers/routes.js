var RoutesController = (function() {
    var config = require('../app.config.json').routes,
        self = {
            init: function(app) {
                self.app = app;

                var routes = Object.keys(config);

                routes.forEach(self.applyRoute);
            },

            applyRoute: function(route) {
                var model = config[route],
                    controller = require(model.controllerPath);

                self.app.use(model.routePath, controller);
            }
        };

    return self;
})();

module.exports = RoutesController;