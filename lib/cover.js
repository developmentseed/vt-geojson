#!/usr/bin/env node
var fs = require('fs')
var cover = require('tile-cover')
var concat = require('concat-stream')

function join (tile) { return tile.join(' ') }
function split (tile) { return tile.split(' ').map(Number) }

module.exports = function coverFeatureOrCollection (geojson, limits) {
  var features = geojson.features ? geojson.features : [geojson]
  var tiles = []
  features.forEach(function (feat) {
    cover.tiles(feat.geometry, limits)
      .map(join)
      .forEach(function (tile) {
        if (tiles.indexOf(tile) < 0) tiles.push(tile)
      })
  })
  return tiles.map(split)
}

if (require.main === module) {
  var argv = process.argv
  var limits = {
    min_zoom: +argv[2],
    max_zoom: +argv[3]
  }

  var input = argv[4] ? fs.createReadStream(argv[4]) : process.stdin

  input.pipe(concat(function (data) {
    var json = JSON.parse(data)
    var tiles = module.exports(json, limits)
    console.log(tiles.map(join).join('\n'))
  }))
}
