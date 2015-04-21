var TileJSON = require('tilejson')
var Get = require('get')
var Agent = require('agentkeepalive')
var agent = new Agent({
  maxSockets: 128,
  maxKeepAliveRequests: 0,
  maxKeepAliveTime: 30000
})
var httpsagent = new Agent.HttpsAgent({
  maxSockets: 128,
  maxKeepAliveRequests: 0,
  maxKeepAliveTime: 30000
})

// TODO: probably better to actually subclass, but this works for now.
TileJSON.prototype.get = function (url, callback) {
  var tilejson = this
  var opts = {
      retry: true,
      uri: url,
      timeout: tilejson.timeout,
      headers: { Connection: 'Keep-Alive' },
      agent: url.indexOf('https:') === 0 ? httpsagent : agent,
      withCredentials: false,
      responseType: 'arraybuffer'
  }
  new Get(opts).asBuffer(done)
  function done (err, result, headers) {
    // Retry if status is missing or in the 5XX range.
    if (err && (!err.status || err.status >= 500) && opts.retry) {
      opts.retry = false
      new Get(opts).asBuffer(done)
    } else {
      callback(err, result, headers)
    }
  }
}

module.exports = function (uri, callback) {
  return new TileJSON(uri, callback)
}
