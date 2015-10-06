#!/usr/bin/env node
var path = require('path')
var concat = require('concat-stream')
var JSONStream = require('JSONStream')
var cover = require('tile-cover')
var envelope = require('turf-envelope')
var vectorTilesToGeoJSON = require('./')
var fix = require('./lib/fix')
var argv = require('yargs')
  .usage('cat polygon.geojson | $0 INPUT [--layers layer1 layer2 ...]\n' +
    'INPUT can be a full tilelive uri, "path/to/file.mbtiles", or just a Mapbox map id.')
  .describe('tile', 'The x y z coordinates of the tile to read.')
  .nargs('tile', 3)
  .describe('layers', 'The layers to read (omit for all layers)')
  .array('layers')
  .describe('bbox', 'The minx miny maxx maxy region to read.')
  .nargs('bbox', 4)
  .alias('z', 'minzoom')
  .describe('minzoom', 'The minzoom')
  .default('minzoom', 1)
  .describe('maxzoom', 'The maxzoom')
  .boolean('tilesOnly')
  .example('cat bounding_polygon.geojson | vt-geojson tilelive_uri minzoom [maxzoom=minzoom] [--layers=layer1,layer2,...]')
  .example('vt-geojson tilelive_uri minx miny maxx maxy [--layers=layer1,layer2,...]')
  .example('vt-geojson tilelive_uri tilex tiley tilez [--layers=layer1,layer2,...]')
  .demand(1)
  .argv

if (!argv.maxzoom) {
  argv.maxzoom = argv.minzoom
}

if (argv.tile) {
  argv.tiles = [argv.tile]
}

var uri = argv._.shift()
if (!/^[^\/]*\:\/\//.test(uri)) {
  if (/mbtiles$/.test(uri)) {
    uri = 'mbtiles://' + path.resolve(uri)
  } else if (!process.env.MapboxAccessToken) {
    throw new Error('MapboxAccessToken environment variable is required for mapbox.com sources.')
  } else {
    uri = 'tilejson+http://api.mapbox.com/v4/' + uri + '.json?access_token=' + process.env.MapboxAccessToken
  }
}

var featureCollection = JSONStream.stringify(
  '{ "type": "FeatureCollection", "features": [ ',
  '\n,\n',
  '] }')

if (!process.stdin.isTTY) {
  process.stdin.pipe(concat(function (data) {
    var geojson = envelope(JSON.parse(data))
    argv.tiles = cover.tiles(geojson.geometry, {
      min_zoom: argv.minzoom,
      max_zoom: argv.maxzoom
    })
    go()
  }))
} else {
  go()
}

function go () {
  var s = vectorTilesToGeoJSON(uri, argv)
  if (!argv.tilesOnly) {
    s.pipe(fix())
    .pipe(featureCollection)
    .pipe(process.stdout)
  } else {
    s.on('data', function (t) {
      process.stdout.write(t.join(' ') + '\n')
    })
  }
}
