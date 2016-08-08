'use strict';

var test = require('tape'),
    express = require('express'),
    request = require('supertest'),
    icylog = require('../index'),
    CustomError = icylog().CustomError();

test('Should load default options', function (t) {
    var app = createApp(new CustomError('Some error', 500));

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
    var app = createApp(new CustomError('Some error', 500), {
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

test('Should propagate if no status code has been set', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.deepEqual(res.body, error, 'should match');
            t.end();
        });
});

test('Should convert string to ExecutionError object', function (t) {
    var error = 'Not an error object',
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.true(res.body.error, 'should exist');
            t.equal(res.body.error.substring(0, 14), 'ExecutionError', 'should match');
            t.equal(res.body.message, error, 'should match');
            t.end();
        });
});

test('Should retain Error object', function (t) {
    var error = new Error('Some error'),
        app = createApp(error);

    error.status = 404;

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.status)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.true(res.body.error, 'should exist');
            t.equal(res.body.error.substring(0, 5), error.name, 'should match');
            t.equal(res.body.message, error.message, 'should match');
            t.end();
        });
});

test('Should retain CustomError type object', function (t) {
    var error = new icylog().CustomError('SomeError')('Some error', 404),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.status)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.true(res.body.error, 'should exist');
            t.equal(res.body.error.substring(0, 9), error.name, 'should match');
            t.equal(res.body.message, error.message, 'should match');
            t.end();
        });
});

test('Should retain existing status code', function (t) {
    var error = new CustomError('Some error', 401),
        app = createApp(error);

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

test('Should propagate if non-error status code has been set', function (t) {
    var error = new CustomError('Some error', 200),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(500)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.deepEqual(res.body, error, 'should match');
            t.end();
        });
});

test('Should create payload', function (t) {
    var error = new CustomError('Some error', 404),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'application/json')
        .expect('Content-Type', /application\/json/)
        .expect(error.status)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.false(res.body.success, 'should be false');
            t.equal(res.body.message, error.message, 'should match');
            t.equal(res.body.error, error.stack, 'should match');
            t.end();
        });
});

test('Should return plain text via JSON.stringify', function (t) {
    var error = new CustomError('Some error', 404),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'text/plain')
        .expect('Content-Type', /text\/plain/)
        .expect(error.status)
        .end(function (err, res) {
            var json = JSON.parse(res.text);

            t.error(err, 'should not exist');
            t.false(json.success, 'should be false');
            t.equal(json.message, error.message, 'should match');
            t.equal(json.error, error.stack, 'should match');
            t.end();
        });
});

test('Should return "Not Acceptable"', function (t) {
    var error = new CustomError('Some error', 404),
        app = createApp(error);

    request(app)
        .get('/')
        .set('Accept', 'x-unknown')
        .expect('Content-Type', /text\/plain/)
        .expect(406)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.equal(res.text, 'Not Acceptable', 'should match');
            t.end();
        });
});

test('Should set nosniff header', function (t) {
    var error = new CustomError('Some error', 400),
        app = createApp(error);

    request(app)
        .get('/')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect(error.status)
        .end(function (err, res) {
            t.error(err, 'should not exist');
            t.end();
        });
});

test('Should invoke wsHandler', function (t) {
    var handler = icylog(),
        error = new CustomError('Some error', 400);

    handler.ws(error, function (err, payload) {
        t.error(err, 'should not exist');
        t.false(payload.success, 'should be false');
        t.equal(payload.message, error.message, 'should match');
        t.equal(payload.error, error.stack, 'should match');
        t.end();
    });
});

test('Should propagate from wsHandler if non-error status code has been set', function (t) {
    var error = new CustomError('Some error', 200),
        errorHandler = icylog().ws;

    errorHandler(error, function (err, payload) {
        t.equal(err.message, error.message, 'should match');
        t.equal(err.stack, error.stack, 'should match');
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