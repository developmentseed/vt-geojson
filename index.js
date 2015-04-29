var zlib = require('zlib')
var Pbf = require('pbf')
var through = require('through2')
var cover = require('tile-cover')
var VectorTile = require('vector-tile').VectorTile
var bboxPoly = require('turf-bbox-polygon')

// this is abstracted out for browserify purposes
var loadSource = require('./lib/tilelive-sources')

module.exports = vectorTilesToGeoJSON

/**
 * Stream GeoJSON from a Mapbox Vector Tile source
 *
 * @param {String} uri - the tilelive URI for the vector tile source to use.
 * @param {Array} layers - The layers to read from the tiles. If empty, read all layers.
 * @param {Array} tiles - The tiles to read from the tilelive source. Can be: an array of `[x, y, z]` tiles, a single `[x, y, z]` tile, a `[minx, miny, maxx, maxy]` bounding box, or omitted (will attempt to read entire extent of the tile source).
 *
 * @return {ReadableStream<Feature>} A stream of GeoJSON Feature objects.
 * Emits `warning` events with `{ tile, error }` when a tile from the
 * requested set is not found.
 */
function vectorTilesToGeoJSON (uri, tiles, layers) {
  if (!tiles) tiles = []
  if (!layers && tiles.length > 0 && typeof tiles[0] === 'string') {
    layers = tiles
  }
  if (layers && layers.length === 0) layers = null
  var stream = through.obj()

  loadSource(uri, function (err, source) {
    if (err) return loadError(err)

    source.getInfo(function (err, info) {
      if (err) return loadError(err)

      var limits = { min_zoom: info.minzoom, max_zoom: info.maxzoom }
      if (tiles.length === 0) {
        tiles = cover.tiles(bboxPoly(info.bounds).geometry, limits)
      } else if (tiles.length === 4 && typeof tiles[0] === 'number') {
        tiles = cover.tiles(bboxPoly(tiles).geometry, limits)
      } else if (tiles.length === 3 && typeof tiles[0] === 'number') {
        tiles = [tiles]
      }

      (function next () {
        if (tiles.length === 0) return stream.end()
        var tile = tiles.pop()
        writeTile(source, tile, stream, next)
      })()
    })
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
          return !layers || layers.indexOf(ln) >= 0
        })
        .forEach(function (ln) {
          var layer = vt.layers[ln]
          if (layers && layers.indexOf(ln) < 0) return

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
