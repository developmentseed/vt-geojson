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
    t.equal(JSON.stringify(data), JSON.stringify(expected.shift()))
  })
})
