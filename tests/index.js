'use strict';

var test = require('tape'),
    express = require('express'),
    request = require('supertest'),
    icylog = require('../index');

test('Should load default options', function (t) {
    var app = createApp(new Error('Some error'));

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.true(res.body.error, 'should exist');
            t.end();
        });
});

test('Should respect specified options', function (t) {
    var app = createApp(new Error('Some error'), {
        env: 'test',
        logger: console
    });

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.false(res.body.error, 'should not exist');
            t.end();
        });
});

test('Should ensure error object', function (t) {
    var error = 'Not an error object',
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(typeof res.body.error, 'object', 'should match');
            t.equal(res.body.message, error, 'should match');
            t.end();
        });
});

test('Should set default status code', function (t) {
    var app = createApp(new Error('Some error'));

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(res.status, 500, 'should match');
            t.end();
        });
});

test('Should retain existing status', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.status = 401;

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.status)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(res.status, error.status, 'should match');
            t.end();
        });
});

test('Should retain existing statusCode', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.statusCode = 401;

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.statusCode)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(res.status, error.statusCode, 'should match');
            t.end();
        });
});

test('Should refuse to invoke httpHandler', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.status = 200;

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(res.body.message.substring(0, 23), 'An unexpected exception', 'should match');
            t.end();
        });
});

test('Should create payload', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.code = 404;

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.code)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.false(res.body.success, 'should be false');
            t.equal(res.body.message, error.message, 'should match');
            t.end();
        });
});

test('Should return plain text via JSON.stringify', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.status = 404;

    request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .expect('Content-Type', /text\/plain/)
        .expect(error.status)
        .end(function (err, res) {
            var json = JSON.parse(res.text),
                errorObj = JSON.parse(JSON.stringify(error));

            t.error(err, 'should not exist');
            t.equal(typeof res.text, 'string', 'should match');
            t.false(json.success, 'should be false');
            t.equal(json.message, error.message, 'should match');
            t.deepEqual(json.error, errorObj, 'should match');
            t.end();
        });
});

test('Should return "Not Acceptable"', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.status = 404;

    request(app)
        .get('/')
        .set('Accept', 'x-unknown')
        .expect('Content-Type', /text\/plain/)
        .expect(406)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(typeof res.text, 'string', 'should match');
            t.equal(res.text, 'Not Acceptable', 'should match');
            t.end();
        });
});

test('Should set nosniff header', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    request(app)
        .get('/')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.end();
        });
});

test('Should invoke wsHandler', function (t) {
    var error = new Error('Some error'),
        errorHandler = icylog().ws;

    errorHandler(error, function (err, payload) {
        t.error(err, 'should not exist');
        t.false(payload.success, 'should be false');
        t.equal(payload.message, error.message, 'should match');
        t.equal(payload.error, error, 'should match');
        t.equal(payload.error.status, 500, 'should match');
        t.end();
    });
});

test('Should refuse to invoke wsHandler', function (t) {
    var error = new Error('Some error'),
        errorHandler = icylog().ws;

    error.status = 200;

    errorHandler(error, function (err, payload) {
        t.equal(err.message.substring(0, 23), 'An unexpected exception', 'should match');
        t.end();
    });
});

function createApp(error, options) {
    var app = express();

    app.get('*', function (req, res, next) {
        next(error);
    });

    app.use(icylog(options).http);

    app.use(function (err, req, res, next) {
        res.status(500);
        res.send(err);
    });

    return app;
}