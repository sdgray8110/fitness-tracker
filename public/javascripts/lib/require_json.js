/*!
 * RequireJS plugin for loading JSON files
 * - depends on Text plugin and it was HEAVILY "inspired" by it as well.
 *
 * IMPORTANT: it only works on r.js optimizer after version 0.26+ 20011/09/27
 *
 * @author Miller Medeiros
 * @version 0.0.1 (2011/06/10)
 * Released under the WTFPL <http://sam.zoy.org/wtfpl/>
 */
define(['text'], function(text){
    //API
    return {

        load : function(name, req, onLoad, config) {
            text.get(req.toUrl(name), function(data){
                if (config.isBuild) {
                    buildMap[name] = data;
                    onLoad(data);
                } else {
                    onLoad(JSON.parse(data));
                }
            });
        },

        //write method based on RequireJS official text plugin by James Burke
        //https://github.com/jrburke/requirejs/blob/master/text.js
        write : function(pluginName, moduleName, write){
            if(moduleName in buildMap){
                var content = buildMap[moduleName];
                write('define("'+ pluginName +'!'+ moduleName +'", function(){ return '+ content +';});\n');
            }
        }

    };
});