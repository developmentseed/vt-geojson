var fs = require('fs')
var test = require('tap').test
var vtgj = require('../')

var GeojsonEquality = require('geojson-equality')
var eq = new GeojsonEquality({ precision: 5 })

test('bbox bounds', function (t) {
  var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'
  var original = fs.readFileSync(__dirname + '/data/original.geojson')
  original = JSON.parse(original)
  var expected = fs.readFileSync(__dirname + '/data/expected-bounds-z13.geojson')
  expected = JSON.parse(expected).features

  t.plan(expected.length * 2)

  vtgj(tileUri, {
    bounds: [ -77.1175, 38.8175, -76.9478, 38.9546 ],
    minzoom: 13,
    maxzoom: 13
  })
  .on('data', function (data) {
    var exp = expected.shift()
    t.ok(eq.compare(data.geometry, exp.geometry))
    t.deepEqual(exp.properties, data.properties)
  })
})

