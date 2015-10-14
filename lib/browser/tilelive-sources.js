var TileJSON = require('tilejson')
var debug = require('../debug')

module.exports = function (uri, callback) {
  debug('loading tilejson', uri)
  return new TileJSON(uri, callback)
}
