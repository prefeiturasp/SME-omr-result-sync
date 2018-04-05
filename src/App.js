'use strict';
const Enumerator = require('./lib/omr-base/class/Enumerator');
const Config = require('./lib/omr-base/config/Config');
Config.init();

const mongo = require('./lib/omr-base/class/Database')(Config.MongoDB);
var Aggregation;

require('./lib/omr-base/class/Log')({
    db: mongo.db,
    connectionString: Config.MongoDB,
    label: Enumerator.LogType.RESULT_SYNC,
    level: Config.KeepLogLevel
});

process.on('uncaughtException', (error) => {
    logger.error(error.message, {
        resource: {
            process: "UncaughtException",
            params: []
        },
        detail: {
            description: error
        }
    }, () => {
        process.exit(1);
    });
});

process.on('unhandledRejection', (error, p) => {
    logger.error(error.message, {
        resource: {
            process: "UnhandledRejection",
            params: []
        },
        detail: {
            description: error
        }
    }, () => {
        process.exit(1);
    });
});

process.on('SIGTERM', () => {
    logger.warn('SIGTERM', {
        resource: {
            process: "SIGTERM",
            params: []
        },
        detail: {
            description: 'Service terminated with SIGTERM signal'
        }
    }, () => {
        process.exit(1);
    });
});

process.on('SIGINT' , () => {
    logger.warn('SIGINT', {
        resource: {
            process: "SIGINT",
            params: []
        },
        detail: {
            description: 'Service terminated with SIGINT signal'
        }
    }, () => {
        process.exit(1);
    });
});

Aggregation = require('./controller/Aggregation.ctrl');
Aggregation.sync();