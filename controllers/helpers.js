const { validate: isUuid } = require('uuid');

function isValidUuid(value) {
  return typeof value === 'string' && isUuid(value);
}

function sendError(res, status, message) {
  return res.status(status).json({
    error: message
  });
}

module.exports = { isValidUuid, sendError };
