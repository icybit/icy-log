function ExecutionError(error, status) {
    var self = this;

    if (!(self instanceof ExecutionError)) {
        return new ExecutionError(error, status);
    }

    switch (typeof (error)) {
        case 'string': {
            error = new Error(error);
            break;
        }
        case 'number': {
            status = error;
            error = new Error();
            break;
        }
        default: {
            error = (error instanceof Error) ? error : new Error();
        }
    }

    Error.call(self, error.message);
    Error.captureStackTrace(self, self.constructor);

    self.name = (error.name !== 'Error') ? error.name : 'ExecutionError';
    self.message = error.message || 'An unexpected error has occurred';
    self.status = status || error.status || error.statusCode || 500;
}

ExecutionError.prototype = Object.create(Error.prototype);
ExecutionError.prototype.constructor = ExecutionError;

module.exports = ExecutionError;