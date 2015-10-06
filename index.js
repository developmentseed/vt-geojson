var zlib = require('zlib')
var Pbf = require('pbf')
var through = require('through2')
var cover = require('tile-cover')
var envelope = require('turf-envelope')
var VectorTile = require('vector-tile').VectorTile
var bboxPoly = require('turf-bbox-polygon')

// this is abstracted out for browserify purposes
var loadSource = require('./lib/tilelive-sources')

module.exports = vtgeojson

/**
 * Stream GeoJSON from a Mapbox Vector Tile source
 *
 * @param {string} uri - the tilelive URI for the vector tile source to use.
 * @param {object} options - options
 * @param {Array<string>} options.layers - An array of layer names to read from tiles.  If empty, read all layers
 * @param {Array} options.tiles - The tiles to read from the tilelive source.  If empty, use `options.bounds` instead.
 * @param {Array} options.bounds - The [minx, miny, maxx, maxy] bounds or a GeoJSON Feature, FeatureCollection, or Geometry defining the region to read from source. Ignored if `options.tiles` is set.  If empty, use the bounds from the input source's metadata.
 * @param {number} options.minzoom - Defaults to the source metadata minzoom.  Ignored if `options.tiles` is set.
 * @param {number} options.maxzoom - Defaults to the source metadata minzoom.  Ignored if `options.tiles` is set.
 * @param {boolean} options.tilesOnly - Output [z, y, x] tile coordinates instead of actually reading tiles.  Useful for debugging.
 * @return {ReadableStream<Feature>} A stream of GeoJSON Feature objects. Emits `warning` events with `{ tile, error }` when a tile from the requested set is not found.
 */
function vtgeojson (uri, options) {
  options = options || {}

  if (options.layers && options.layers.length === 0) options.layers = null

  var stream = through.obj()
  loadSource(uri, function (err, source) {
    if (err) return loadError(err)
    var tiles = options.tiles
    if (tiles) return next()
    source.getInfo(function (err, info) {
      if (err) return loadError(err)

      var limits = {
        min_zoom: options.minzoom || info.minzoom,
        max_zoom: options.maxzoom || info.maxzoom
      }

      if (Array.isArray(options.bounds)) {
        tiles = cover.tiles(bboxPoly(options.bounds).geometry, limits)
      } else if (options.bounds) {
        tiles = cover.tiles(envelope(options.bounds).geometry, limits)
      } else {
        tiles = cover.tiles(bboxPoly(info.bounds).geometry, limits)
      }

      next()
    })

    function next () {
      if (tiles.length === 0) return stream.end()

      if (options.tilesOnly) {
        tiles.forEach(stream.write.bind(stream))
        return stream.end()
      }

      var tile = tiles.pop()
      setImmediate(writeTile.bind(null, source, tile, stream, next))
    }
  })

  return stream

  function loadError (err) {
    stream.emit('error', err)
    stream.end()
  }

  function tileError (tile, err) {
    stream.emit('warning', {
      tile: tile,
      error: err
    })
  }

  function writeTile (source, tile, stream, next) {
    var x = tile[0]
    var y = tile[1]
    var z = tile[2]

    source.getTile(z, x, y, function (err, tiledata, opts) {
      if (err) {
        tileError(tile, err)
        return next()
      }

      if (opts['Content-Encoding'] === 'gzip') {
        zlib.gunzip(tiledata, processTile)
      } else {
        processTile(null, tiledata)
      }

      function processTile (err, tiledata) {
        if (err) {
          tileError(tile, err)
          return next()
        }

        var vt = new VectorTile(new Pbf(tiledata))

        Object.keys(vt.layers)
        .filter(function (ln) {
          return !options.layers || options.layers.indexOf(ln) >= 0
        })
        .forEach(function (ln) {
          var layer = vt.layers[ln]
          if (options.layers && options.layers.indexOf(ln) < 0) return

          for (var i = 0; i < layer.length; i++) {
            var feat = layer.feature(i).toGeoJSON(x, y, z)
            stream.write(feat)
          }
        })

        next()
      }
    })
  }
}
