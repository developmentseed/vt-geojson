var tilelive = require('tilelive')
require('tilejson').registerProtocols(tilelive)
require('mbtiles').registerProtocols(tilelive)

module.exports = function (uri, callback) {
  return tilelive.load(uri, callback)
}
