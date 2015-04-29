#!/usr/bin/env node
var path = require('path')
var concat = require('concat-stream')
var JSONStream = require('JSONStream')
var cover = require('tile-cover')
var vectorTilesToGeoJSON = require('./')
var fix = require('./lib/fix')

if (process.argv.length < 3) {
  console.log('Usage:')
  console.log('cat bounding_polygon.geojson | vt-geojson tilelive_uri minzoom maxzoom')
  console.log('vt-geojson tilelive_uri minx miny maxx maxy')
  console.log('vt-geojson tilelive_uri tilex tiley tilez')
  process.exit()
}

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
    vectorTilesToGeoJSON(uri, tiles).pipe(fix()).pipe(json)
  }))
} else {
  vectorTilesToGeoJSON(uri, tiles).pipe(fix()).pipe(json)
}
