#!/usr/bin/env node
var hint = require('geojsonhint').hint
var through = require('through2')
var debug = require('debug')('polypop')

var count = 0
module.exports = function fix () {
  return through.obj(function (feat, _, next) {
    /*
     * Strip degenerate polygons
     */
    var geom = feat.geometry
    if (geom.type === 'Polygon') {
      geom.coordinates = filterPolygonLineStrings(geom.coordinates)
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(filterPolygonLineStrings)
    }

    /*
     * Filter out anything that doesn't pass geojsonhint
     */
    var hints = hint(feat)
    if (hints.length > 0) {
      debug('Dropping', count++, hints)
      next()
    } else {
      next(null, feat)
    }
  })
}

// filter out degenerate polygon rings, but make sure not to strip
// off the outer ring if there are holes inside (because that could turn
// negative space holes into positive space outer ring)
function filterPolygonLineStrings (linestrings) {
  return linestrings.filter(function (linestring, i) {
    return (i === 0 && linestrings.length === 1) || (linestring.length >= 4)
  })
}
