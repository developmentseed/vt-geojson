#!/usr/bin/env node
var path = require('path')
var concat = require('concat-stream')
var JSONStream = require('JSONStream')
var cover = require('tile-cover')
var vectorTilesToGeoJSON = require('./')
var fix = require('./lib/fix')
var argv = require('minimist')(process.argv.slice(2))

if (argv._.length < 2) {
  console.log('Usage:')
  console.log('cat bounding_polygon.geojson | vt-geojson tilelive_uri minzoom [maxzoom=minzoom] [--layers=layer1,layer2,...]')
  console.log('vt-geojson tilelive_uri minx miny maxx maxy [--layers=layer1,layer2,...]')
  console.log('vt-geojson tilelive_uri tilex tiley tilez [--layers=layer1,layer2,...]')
  process.exit()
}

var uri = argv._.shift()
if (!/^[^\/]*\:\/\//.test(uri)) {
  uri = 'mbtiles://' + path.resolve(uri)
}

var featureCollection = JSONStream.stringify(
  '{ "type": "FeatureCollection", "features": [ ',
  '\n,\n',
  '] }')

var layers = argv.layers ? argv.layers.split(',') : undefined
var tiles = argv._
if (tiles.length === 2) {
  process.stdin.pipe(concat(function (data) {
    var geojson = JSON.parse(data).geometry
    tiles = cover.tiles(geojson, {
      min_zoom: tiles[0],
      max_zoom: tiles[1] || tiles[0]
    })
    vectorTilesToGeoJSON(uri, tiles, layers)
      .pipe(fix())
      .pipe(featureCollection)
      .pipe(process.stdout)
  }))
} else {
  vectorTilesToGeoJSON(uri, tiles, layers)
    .pipe(fix())
    .pipe(featureCollection)
    .pipe(process.stdout)
}
