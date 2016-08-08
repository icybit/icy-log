module.exports = function CustomError(name) {
    function CustomErrorType(message, status) {
        var self = this;

        if (!(self instanceof CustomErrorType)) {
            return new CustomErrorType(message, status);
        }

        Error.captureStackTrace(self, self.constructor);

        self.name = name || 'CustomError';
        self.message = message || 'An unexpected error has occurred';
        self.status = status || 500;
    }

    CustomErrorType.prototype = Object.create(Error.prototype);
    CustomErrorType.prototype.constructor = CustomErrorType;
    
    return CustomErrorType;
};