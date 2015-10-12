var tilelive = require('tilelive')
require('tilejson').registerProtocols(tilelive)
require('mbtiles').registerProtocols(tilelive)

module.exports = function (uri, callback) {
  tilelive.auto(uri)
  return tilelive.load(uri, callback)
}

// for conditionally testing in node/browser
module.exports.mbtiles = true
