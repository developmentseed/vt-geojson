var path = require('path')
var zlib = require('zlib')
var from = require('from2')
var Pbf = require('pbf')
var VectorTile = require('vector-tile').VectorTile
var JSONStream = require('JSONStream')
var tilelive = require('tilelive')
var cover = require('tile-cover')
var bboxPoly = require('turf-bbox-polygon')
var concat = require('concat-stream')
require('tilejson').registerProtocols(tilelive)
require('mbtiles').registerProtocols(tilelive)

module.exports = vectorTilesToGeoJSON

/**
 * Given a Tilelive uri for a vector tile source and an array of [z, x, y]
 * tiles, return a GeoJSON FeatureCollection of all features in those
 * tiles.
 */
function vectorTilesToGeoJSON (uri, tiles) {
  var source = null

  return from.obj(function (size, next) {
    var self = this
    if (source) {
      return read.call(self, size, next)
    } else {
      tilelive.load(uri, function (err, src) {
        if (err) { return next(err) }
        source = src
        source.getInfo(function (err, info) {
          if (err) { return next(err) }
          var limits = { min_zoom: info.minzoom, max_zoom: info.maxzoom }
          if (tiles.length === 0) {
            tiles = cover.tiles(bboxPoly(info.bounds).geometry, limits)
          } else if (tiles.length === 4 && typeof tiles[0] === 'number') {
            tiles = cover.tiles(bboxPoly(tiles).geometry, limits)
          } else if (tiles.length === 3 && typeof tiles[0] === 'number') {
            tiles = [tiles]
          }
          read.call(self, size, next)
        })
      })
    }
  })

  function read (_, next) {
    var self = this
    if (tiles.length === 0) return self.push(null)

    var tile = tiles.pop()
    var x = tile[0]
    var y = tile[1]
    var z = tile[2]
    source.getTile(z, x, y, function (err, tiledata, opts) {
      // TODO: just swallowing these errors so as to not fail if
      // source doesn't contain a particular tile... this should
      // probably be configurable or something
      if (err) {
        console.error(z, x, y, err)
        return read.call(self, _, next)
      }

      if (opts['Content-Encoding'] === 'gzip') {
        zlib.gunzip(tiledata, processTile)
      } else {
        processTile(null, tiledata)
      }

      function processTile (err, tiledata) {
        if (err) { return next(err) }

        var vt = new VectorTile(new Pbf(tiledata))

        Object.keys(vt.layers)
          .forEach(function (ln) {
            var layer = vt.layers[ln]
            for (var i = 0; i < layer.length; i++) {
              var feat = layer.feature(i).toGeoJSON(x, y, z)
              self.push(feat)
            }
          })
        read.call(self, _, next)
      }
    })
  }
}

if (require.main === module) {
  var uri = process.argv[2]
  if (!/^[^\/]*\:\/\//.test(uri)) {
    uri = 'mbtiles://' + path.resolve(uri)
  }

  var json = JSONStream.stringify('{ "type": "FeatureCollection", "features": [ ',
    '\n,\n', '] }')
  json.pipe(process.stdout)

  var tiles = process.argv.slice(3).map(Number)
  if (tiles.length === 2) {
    process.stdin.pipe(concat(function (data) {
      var geojson = JSON.parse(data)
      geojson = geojson.features ? geojson.features[0] : geojson
      geojson = geojson.geometry
      tiles = cover.tiles(geojson, { min_zoom: tiles[0], max_zoom: tiles[1] })
      process.exit()
      vectorTilesToGeoJSON(uri, tiles).pipe(json)
    }))
  } else {
    vectorTilesToGeoJSON(uri, tiles).pipe(json)
  }
}
