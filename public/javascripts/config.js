/**
 * main and config
 *
 * Require configuration and definition of main
 */
require.config({
    // Increase the wait time before giving up on a script
    waitSeconds: 15,
    baseUrl: '/javascripts',
    paths: {
        // Global
        global: 'global',

        // Core Libraries
        async: 'lib/require_async',
        text: 'lib/require_text',
        json: 'lib/require_json',
        mustache: 'lib/mustache',
        moment: 'lib/moment',
        jquery: 'lib/jquery-2.1.1.min',
        maskedInput: 'lib/jquery.maskedInput',
        serializeObject: 'lib/serializeObject',
        d3: 'lib/d3',
        nvd3: 'lib/nv.d3',

        // Modules
        rideForm: 'modules/rideForm',
        activityForm: 'modules/activityForm',
        foodForm: 'modules/foodForm',
        mealForm: 'modules/mealForm',
        healthForm: 'modules/healthForm',
        validation: 'modules/validation'
    }
}); // end require.config

define(['jquery'], function() {
    require(['global'], function(Global) {
        Global.init();
    });
});