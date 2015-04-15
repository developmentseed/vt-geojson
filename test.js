var fs = require('fs')
var test = require('tape')
var concat = require('concat-stream')
var cover = require('./lib/cover')
var vtgj = require('./')

var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'

test('basic', function (t) {
  var original = fs.readFileSync(__dirname + '/data/original.geojson')
  original = JSON.parse(original)
  var expected = fs.readFileSync(__dirname + '/data/expected-z13.geojson')
  expected = JSON.parse(expected)

  var limits = {
    min_zoom: 13,
    max_zoom: 13
  }

  var tiles = cover(original, limits)
  vtgj(tileUri, tiles)
    .pipe(concat(function (data) {
      t.deepEqual(data, expected.features)
      t.end()
    }))
})
