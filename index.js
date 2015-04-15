var zlib = require('zlib')
var from = require('from2')
var Pbf = require('pbf')
var VectorTile = require('vector-tile').VectorTile
var JSONStream = require('JSONStream')
var split = require('split')
var through = require('through2')
var tilelive = require('tilelive')
require('mbtiles').registerProtocols(tilelive)
require('tilejson').registerProtocols(tilelive)

module.exports = vectorTilesToGeoJSON

/**
 * Given a Tilelive uri for a vector tile source and an array of [z, x, y] tiles,
 * return a GeoJSON FeatureCollection of all features in those
 * tiles.
 */
function vectorTilesToGeoJSON (uri, tiles) {
  tiles = [].concat(tiles)

  var source = null

  var _read = function (_, next) {
    var self = this
    if (tiles.length === 0) return self.push(null)

    var tile = tiles.pop()
    var x = tile[0]
    var y = tile[1]
    var z = tile[2]
    source.getTile(z, x, y, function (err, tiledata, opts) {
      if (err) { return next(err) }

      if (opts['Content-Encoding'] === 'gzip') {
        zlib.gunzip(tiledata, processTile)
      } else {
        processTile(null, tiledata)
      }

      function processTile (err, tiledata) {
        if (err) { return next(err) }

        var vt = new VectorTile(new Pbf(tiledata))
        Object.keys(vt.layers)
          .map(function (ln) {
            return vt.layers[ln]
          })
          .forEach(function (layer) {
            for (var i = 0; i < layer.length; i++) {
              var feat = layer.feature(i).toGeoJSON(x, y, z)
              self.push(feat)
            }
          })
        _read.call(self, _, next)
      }
    })
  }

  return from.obj(function read (size, next) {
    var self = this
    if (source) {
      return _read.call(self, size, next)
    } else {
      tilelive.load(uri, function (err, src) {
        if (err) { return next(err) }
        source = src
        return _read.call(self, size, next)
      })
    }
  })
}

if (require.main === module) {
  var uri = process.argv[2]

  var json = JSONStream.stringify('{ "type": "FeatureCollection", "features": [ ',
    '\n,\n', '] }')
  json.pipe(process.stdout)

  if (process.argv.length > 3) {
    var tile = process.argv.slice(3, 6).map(Number)
    vectorTilesToGeoJSON(uri, [tile])
      .pipe(json)
  } else {
    // TODO: this is a bogus way to do the duplex stream, but
    // shouldn't matter since we're only buffering a list of tiles, which
    // is WAY smaller than the tiles themselves
    var tiles = []
    process.stdin
      .pipe(split())
      .pipe(through(function (line, enc, next) {
        var t = line.toString().split(' ').map(Number)
        if (t.length === 3) {
          tiles.push(t)
        }
        next()
      }))
      .on('data', function () {})
      .on('end', function () {
        vectorTilesToGeoJSON(uri, tiles)
          .pipe(json)
      })
  }
}
