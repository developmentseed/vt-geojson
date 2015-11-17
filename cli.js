#!/usr/bin/env node
var path = require('path')
var concat = require('concat-stream')
var JSONStream = require('JSONStream')
var vectorTilesToGeoJSON = require('./')
var fix = require('./lib/fix')
var argv = require('yargs')
  .usage('cat polygon.geojson | $0 INPUT [--layers layer1 layer2 ...]\n' +
    'INPUT can be a full tilelive uri, "path/to/file.mbtiles", or just a Mapbox map id.')
  .options({
    tile: {
      describe: 'The x y z coordinates of the tile to read.',
      nargs: 3
    },
    layers: {
      describe: 'The layers to read (omit for all layers)',
      array: true
    },
    bounds: {
      describe: 'The minx miny maxx maxy region to read.',
      nargs: 4
    },
    minzoom: {
      alias: 'z'
    },
    maxzoom: {
      alias: 'Z'
    },
    tilesOnly: {
      describe: 'Only list the tiles that would be read, instead of actually reading them.',
      boolean: true
    },
    clean: {
      describe: 'Attempt to fix degenerate features and filter out any that don\'t pass geojsonhint',
      boolean: true,
      default: true
    },
    strict: {
      describe: 'Emit an error and end the stream if a tile is not found or can\'t be read',
      boolean: true,
      default: false
    }
  })
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

if (argv.testargs) {
  console.log(argv)
  process.exit()
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
    argv.bounds = JSON.parse(data)
    go()
  }))
} else {
  go()
}

function go () {
  var s = vectorTilesToGeoJSON(uri, argv)
  if (!argv.tilesOnly) {
    if (argv.clean) { s = s.pipe(fix()) }
    s.pipe(featureCollection)
    .pipe(process.stdout)
  } else {
    s.on('data', function (t) {
      process.stdout.write(t.join(' ') + '\n')
    })
  }
}
