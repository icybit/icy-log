var async = require('async'),
    debug = require('debug')('icybit:icy-log'),
    UnexpectedError = require('icy-error')();

module.exports = icylog;

function icylog(opts) {
    var options = opts || {},
        env = options.env || process.env.NODE_ENV || 'development',
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

            res.status(err.status || err.data.status);
            res.setHeader('X-Content-Type-Options', 'nosniff');

            res.format({
                text: function () {
                    res.send(JSON.stringify(payload));
                },
                json: function () {
                    res.send(payload);
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
                payload.error = err.stack;
            }

            return callback(null, payload);
        }

        function electHandler(locals, callback) {
            var type = locals.err.status || (locals.err.data && locals.err.data.status) || 9,
                category = parseInt(type.toString()[0]);

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
                    debug('Elected UnexpectedError handler. Propagating error..');
                    return callback(locals.err);
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
                err = new UnexpectedError((typeof (err) === 'string') ? err : '');
            }

            locals.err = err;

            return callback(null, locals.err);
        }
    }

    function unexpectedHandler(error) {
        debug('Invoking UnexpectedError handler');
        logger.error('An unexpected exception has occurred. %s', error.toString());

        error = (error.name === 'Error') ? new UnexpectedError(error.message) : error;

        if (env !== 'development') {
            delete error.stack;
        }

        return error;
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