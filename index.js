'use strict';

var async = require('async'),
    debug = require('debug')('icybit:error-handler');

module.exports = icylog;

function icylog(opts) {
    var options = opts || {},
        env = options.env || 'development',
        logger = options.logger || { error: function () { } };

    debug('Setting up middleware for the ' + env + ' environment');

    return {
        http: httpHandler,
        ws: wsHandler
    };

    function httpHandler(err, req, res, next) {
        debug('Received error: ' + err);
        debug('Invoking HTTP handler middleware');

        preHandler(err, function (err, results) {
            var error, handler, payload;

            if (err) {
                return next(unexpectedHandler(err));
            }
			
            error = results[0];
            handler = results[1];
            payload = results[2];

            handler(error, function () {
                handleHttpResponse(error, req, res, payload);
            });
        });

        function handleHttpResponse(err, req, res, payload) {
            debug('Submitting HTTP response');

            res.status(err.status);
            res.setHeader('X-Content-Type-Options', 'nosniff');

            res.format({
                json: function () {
                    res.send(payload);
                },
                text: function () {
                    res.send(JSON.stringify(payload));
                },
                'default': function () {
                    res.status(406).type('text').send('Not Acceptable');
                }
            });
        }
    }

    function preHandler(error, callback) {
        var locals = {
            err: error
        };

        debug('Attempting to pre-process error');

        async.series([
            ensureError.bind(null, locals),
            electHandler.bind(null, locals),
            createPayload.bind(null, locals)
        ], callback);

        function createPayload(locals, callback) {
            var err = locals.err,
                payload = {
                    success: false,
                    message: err.message
                };

            if (env === 'development') {
                payload.error = err;
            }

            return callback(null, payload);
        }

        function electHandler(locals, callback) {
            var type = locals.err.status.toString()[0],
            category = parseInt(type);

            switch (category) {
                case 4: {
                    debug('Elected Client handler');
                    return callback(null, clientHandler);
                }
                case 5: {
                    debug('Elected Server handler');
                    return callback(null, serverHandler);
                }
                default: {
                    debug('Failed to elect handler');
                    return callback(new Error('The HTTP Status Code is neither 4xx or 5xx. Refusing to treat as Error'));
                }
            }

            function clientHandler(err, callback) {
                debug('Invoking Client handler');
                logger.error('Client Error. %s', err.toString());
                return callback(null);
            }

            function serverHandler(err, callback) {
                debug('Invoking Server handler');
                logger.error('Internal Server Error. %s', err.toString());
                return callback(null);
            }
        }

        function ensureError(locals, callback) {
            var err = locals.err;

            if (!(err instanceof Error)) {
                err = new Error(err + '');
            }

            if (!err.status) {
                err.status = err.code || err.statusCode || 500;
            }

            locals.err = err;

            return callback(null, locals.err);
        }
    }

    function unexpectedHandler(error) {
        var payload = {
            success: false,
            message: 'An unexpected exception has occurred. ' + error.message
        };

        if (env === 'development') {
            payload.error = error;
        }

        debug('Invoking UnexpectedError handler');

        logger.error('An unexpected exception has occurred. %s', error.toString());

        return payload;
    }

    function wsHandler(err, callback) {
        var callback = (typeof callback === 'function' ? callback : function () { });

        debug('Received error: ' + err);
        debug('Invoking WS handler middleware');

        preHandler(err, function (err, results) {
            var error, handler, payload;

            if (err) {
                return callback(unexpectedHandler(err));
            }
			
            error = results[0];
            handler = results[1];
            payload = results[2];

            handler(error, function () {
                handleWsResponse(payload, callback);
            });
        });

        function handleWsResponse(payload, callback) {
            debug('Submitting WS response');

            return callback(null, payload);
        }
    }
}