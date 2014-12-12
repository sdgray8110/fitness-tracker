var express = require('express'),
    router = express.Router(),
    helpers = require('../helpers'),
    dirStructure = helpers.folderStructure('views');

dirStructure.forEach(function(root) {
    router.get(root + '/:filename', function(req, res){
        var path = root + '/' + req.params.filename + '.handlebars';

        res.sendFile(path, {root: './views'});
    });
});

module.exports = router;