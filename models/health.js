var HealthCollection = (function() {
    var self = {
        processMeta: function(data) {
            return {title: data.title + ' | ' + 'Health'}
        },

        dataAccess: {
            fetch: function(req, res, callback) {
                var fieldAssociation = {
                        meta: {method: 'processMeta', data: {title: req.title}}
                    },
                    model = {};

                req.fields.forEach(function(field) {
                    var association = fieldAssociation[field];

                    model[field] = self[association.method](association.data);
                });

                callback(model);
            }
        }
    };

    return self;
})();

module.exports = HealthCollection;