require('phantomjs-polyfill')
require('./lib/debug').enabled = true

var fs = require('fs')
var test = require('tape')
var cover = require('./lib/cover')
var vtgj = require('./')
var protocols = require('tilelive').protocols

if (protocols['mbtiles:']) {
  test('basic', function (t) {
    var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'
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
}

var accessToken = process.env.MAPBOX_API_KEY

test('remote', function (t) {
  var tileUri = 'tilejson+http://api.tiles.mapbox.com/v4/devseed.73553afc.json?access_token=' + accessToken
  var dragon = fs.readFileSync(__dirname + '/data/dragon.geojson')
  dragon = JSON.parse(dragon)

  var limits = {
    min_zoom: 0,
    max_zoom: 0
  }

  t.plan(1)

  var expected = dragon.features
  var tiles = cover(dragon, limits)
  vtgj(tileUri, tiles)
  .on('data', function (data) {
    var exp = expected.shift()
    exp.geometry.coordinates = roundCoordinates(exp.geometry.coordinates, 1e4)
    data.geometry.coordinates = roundCoordinates(data.geometry.coordinates, 1e4)
    // hack - only check the beginning of the coordinates, because vt
    // simplification does funny things with the end.
    exp.geometry.coordinates[0] = exp.geometry.coordinates[0].slice(0, 10)
    data.geometry.coordinates[0] = data.geometry.coordinates[0].slice(0, 10)
    t.deepEqual(data, exp)
  })
  .on('end', function () {
    t.end()
    // TODO this should NOT be necessary.  I think it may be because
    // node-tilejson is holding onto the http connection, but there isn't an
    // obvious way to close it.
    if (typeof process.exit === 'function') {
      process.exit()
    }
  })
  .on('error', function (err) {
    t.error(err)
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
