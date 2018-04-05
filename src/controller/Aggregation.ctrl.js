'use strict';
const async = require('async');
const Enumerator = require('../lib/omr-base/class/Enumerator');
const Config = require('../lib/omr-base/config/Config');
const AggregationBO = require('../lib/omr-base/business/Aggregation.bo');
const ExamBO = require('../lib/omr-base/business/Exam.bo');
const Connector = require('../lib/omr-base/connector/ConnectorManager')(Config, Enumerator);
const aggregation = new AggregationBO();
const exam = new ExamBO();

class AggregationController {

    static sync () {
        aggregation.GetByQuery(null, null, null, null, (error, result) => {
            if (error) {
                logger.error(error.message, {
                    resource: {
                        process: "AggregationController.sync",
                        params: []
                    },
                    detail: {
                        description: error
                    }
                }, () => {
                    process.exit(1);
                });
            } else if (result.length) {
                let queue;

                logger.info('Started', {
                    resource: {
                        process: "AggregationController.sync",
                    }
                });

                queue = result.map((ag) => {
                    return (_c) => {
                        Connector.SendResult(ag._id)
                            .then(() => {
                                AggregationController.updateSyncCount(ag._id)
                                    .then(_c)
                                    .catch((error) => {
                                        logger.error(error.message, {
                                            resource: {
                                                process: "AggregationController.updateSyncCount",
                                                params: [ag._id]
                                            },
                                            detail: {
                                                description: error
                                            }
                                        }, () => {
                                            _c()
                                        });
                                    });
                            })
                            .catch((error) => {
                                logger.error(error.message, {
                                    resource: {
                                       process: "Connector.SendResult",
                                       params: [ag._id]
                                    },
                                    detail: {
                                        description: error
                                    }
                                }, () => {
                                    _c()
                                });
                            });
                    };
                });

                async.parallelLimit(queue, 2, () => {
                    logger.info('Finished', {
                        resource: {
                            process: "AggregationController.sync",
                        }
                    }, () => {
                        process.exit(0);
                    });
                })
            } else process.exit(0);
        }, null, null, null, null, undefined, true);
    }

    static updateSyncCount(aggregationId) {
        return new Promise((resolve, reject) => {
            exam.GetDistinct(
                'owner.Section_Id',
                {
                    _aggregation: aggregationId,
                    $or: [
                        {processStatus: Enumerator.ProcessStatus.WARNING},
                        {processStatus: Enumerator.ProcessStatus.SUCCESS}
                    ]
                }, (error, dTotal) => {
                    if (error) reject(error);
                    else {
                        exam.GetDistinct(
                            'owner.Section_Id',
                            {
                                _aggregation: aggregationId,
                                sent: true,
                                $or: [
                                    {processStatus: Enumerator.ProcessStatus.WARNING},
                                    {processStatus: Enumerator.ProcessStatus.SUCCESS}
                                ]
                            }, (error, dSent) => {
                                if (error) reject(error);
                                else {
                                    aggregation.UpdateByQuery(
                                        {_id: aggregationId},
                                        {$set: {
                                            'sync.total': dTotal.length,
                                            'sync.sent': dSent.length
                                        }}, null, (error) => {
                                            if (error) reject(error);
                                            else resolve();
                                        }
                                    )
                                }
                            }
                        );
                    }
                }
            );
        });
    }
}

module.exports = AggregationController;
