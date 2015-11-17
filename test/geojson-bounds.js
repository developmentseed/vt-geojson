var fs = require('fs')
var test = require('tap').test
var GeojsonEquality = require('geojson-equality')
var vtgj = require('../')

var eq = new GeojsonEquality({ precision: 5 })

test('geojson bounds', function (t) {
  var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'
  var original = fs.readFileSync(__dirname + '/data/original.geojson')
  original = JSON.parse(original)
  var expected = fs.readFileSync(__dirname + '/data/expected-bounds-z13.geojson')
  expected = JSON.parse(expected).features

  t.plan(expected.length * 2)

  vtgj(tileUri, {
    bounds: original,
    minzoom: 13,
    maxzoom: 13
  })
  .on('data', function (data) {
    var exp = expected.shift()
    t.ok(eq.compare(exp.geometry, data.geometry))
    t.deepEqual(exp.properties, data.properties)
  })
})
