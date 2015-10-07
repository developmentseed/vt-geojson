#!/usr/bin/env node
var hint = require('geojsonhint').hint
var through = require('through2')
var debug = require('debug')('vt-geojson')

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
function filterPolygonLineStrings (rings) {
  return rings
  .map(function (ring) {
    var e = ring.length - 1
    if (ring[0][0] !== ring[e][0] || ring[0][1] !== ring[e][1]) {
      debug('Attempting to fix broken ring', ring)
      ring.push([ring[0][0], ring[0][1]])
    }
    return ring
  })
  .filter(function (ring, i) {
    return (i === 0 && rings.length > 1) || (ring.length >= 4)
  })
}
