const helmet = require('helmet');
const compression = require('compression');

modules.export = function(app){
    app.use(helmet());
    app.use(compression());
};