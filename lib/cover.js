var cover = require('tile-cover')

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
