const setRateLimit = require("express-rate-limit");

// Rate limit middleware
const rateLimitMiddleware = setRateLimit({
  windowMs: 60 * 1000, //each minute
  max: 25, //30 limit
  message: "You have exceeded your 15 requests per minute limit.",
  headers: true,
});

module.exports = rateLimitMiddleware;