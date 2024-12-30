const { RateLimiterMemory } = require("rate-limiter-flexible");

const opts = {
    keyPrefix: 'rate-limiter',
    points: 24, // requests per
    duration: 60  // seconds by IP
};

const rateLimiter = new RateLimiterMemory(opts);

function rateLimitMiddleware2(req, res, next) {
   rateLimiter
     .consume(req.connection.remoteAddress)
     .then(() => {
      next()
   })
    .catch(() => {
      res.status(429)
         .send('<h1>Too Many Requests</h1>')
   })
}
  
module.exports = rateLimitMiddleware2;