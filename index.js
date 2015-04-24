var path = require('path')
var zlib = require('zlib')
var through = require('through2')
var Pbf = require('pbf')
var VectorTile = require('vector-tile').VectorTile
var JSONStream = require('JSONStream')
var cover = require('tile-cover')
var bboxPoly = require('turf-bbox-polygon')
var concat = require('concat-stream')
//
// this is abstracted out for browserify purposes
var loadSource = require('./lib/tilelive-sources')

module.exports = vectorTilesToGeoJSON

/**
 * Stream GeoJSON from a Mapbox Vector Tile source
 *
 * @param {String} uri - the tilelive URI for the vector tile source to use.
 * @param {Array} tiles - The tiles to read from the tilelive source. Can be:
 *  - An array of [x, y, z] tiles.
 *  - A single [x, y, z] tile.
 *  - A [minx, miny, maxx, maxy] bounding box
 *  - Omitted (will attempt to read entire extent of the tile source.
 *
 * @return {ReadableStream<Feature>} A stream of GeoJSON Feature objects.
 * Emits 'warning' events with { tile, error } when a tile from the
 * requested set is not found.
 */
function vectorTilesToGeoJSON (uri, tiles) {
  if (!tiles) tiles = []
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
        .forEach(function (ln) {
          var layer = vt.layers[ln]
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
      vectorTilesToGeoJSON(uri, tiles).pipe(json)
    }))
  } else {
    vectorTilesToGeoJSON(uri, tiles).pipe(json)
  }
}
