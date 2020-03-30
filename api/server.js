// Grab the blacklist from the command-line so that we can update the blacklist without deploying
// again. CORS Anywhere is open by design, and this blacklist is not used, except for countering
// immediate abuse (e.g. denial of service). If you want to block all origins except for some,
// use originWhitelist instead.

const originBlacklist = parseEnvList(process.env.CORSANYWHERE_BLACKLIST);

const originWhitelist = parseEnvList(process.env.CORSANYWHERE_WHITELIST);
function parseEnvList(env) {
  if (!env) {
    return [];
  }
  return env.split(',');
}

// Set up rate-limiting to avoid abuse of the public CORS Anywhere server.

const checkRateLimit = require('../lib/rate-limit')(process.env.CORSANYWHERE_RATELIMIT);

const cors_proxy = require('../lib/cors-anywhere').createServer({
  originBlacklist: originBlacklist,
  originWhitelist: originWhitelist,
  requireHeader: ['origin', 'x-requested-with'],
  checkRateLimit: checkRateLimit,
  removeHeaders: [
    'cookie',
    'cookie2',
    // Strip Heroku-specific headers
    'x-heroku-queue-wait-time',
    'x-heroku-queue-depth',
    'x-heroku-dynos-in-use',
    'x-request-start',
  ],
  redirectSameOrigin: true,
  httpProxyOptions: {
    // Do not add X-Forwarded-For, etc. headers, because Heroku already adds it.
    xfwd: false,
  },
})

module.exports = (req, res) => {
  let url = '/';
  if (req.query._url) url += req.query._url;
  else url += 'iscorsneeded';
  const reqModified = Object.assign(req, {url})
  
  cors_proxy.emit('request', reqModified, res);
};

