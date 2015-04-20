var fs = require('fs')
var test = require('tape')
var cover = require('./lib/cover')
var vtgj = require('./')

var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'

test('basic', function (t) {
  var original = fs.readFileSync(__dirname + '/data/original.geojson')
  original = JSON.parse(original)
  var expected = fs.readFileSync(__dirname + '/data/expected-z13.geojson')
  expected = JSON.parse(expected).features

  var limits = {
    min_zoom: 13,
    max_zoom: 13
  }

  t.plan(expected.length)

  var tiles = cover(original, limits)
  vtgj(tileUri, tiles)
  .on('data', function (data) {
    var exp = expected.shift()
    exp.geometry.coordinates = roundCoordinates(exp.geometry.coordinates, 1e4)
    data.geometry.coordinates = roundCoordinates(data.geometry.coordinates, 1e4)

    t.deepEqual(exp, data)
  })
})

function roundCoordinates (coordinates, p) {
  if (!coordinates.length || coordinates.length === 0) {
    return coordinates
  } else if (typeof coordinates[0] === 'number') {
    return coordinates.map(function (x) { return Math.round(x * p) / p })
  } else {
    return coordinates.map(function (c) { return roundCoordinates(c, p) })
  }
}
