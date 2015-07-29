var TileJSON = require('tilejson')
var Get = require('get')
var debug = require('../debug')
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
  debug('get start ', url)
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
    debug('get done', url, err ? err : 'success')
    // Retry if status is missing or in the 5XX range.
    if (err && (!err.status || err.status >= 500) && opts.retry) {
      opts.retry = false
      debug('retrying')
      new Get(opts).asBuffer(done)
    } else {
      callback(err, result, headers)
    }
  }
}

module.exports = function (uri, callback) {
  debug('loading tilejson', uri)
  return new TileJSON(uri, callback)
}
