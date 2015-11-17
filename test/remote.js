var fs = require('fs')
var test = require('tap').test
var cover = require('../lib/cover')
var vtgj = require('../')

var GeojsonEquality = require('geojson-equality')
var eq = new GeojsonEquality({ precision: 5 })

var accessToken = process.env.MAPBOX_API_KEY

test('remote', function (t) {
  t.plan(2)
  t.ok(accessToken, 'MAPBOX_API_KEY environment variable is set.')
  var tileUri = 'tilejson+http://api.tiles.mapbox.com/v4/devseed.73553afc.json?access_token=' + accessToken
  var dragon = fs.readFileSync(__dirname + '/data/dragon.geojson')
  dragon = JSON.parse(dragon)

  var limits = {
    min_zoom: 0,
    max_zoom: 0
  }

  var expected = dragon.features
  var tiles = cover(dragon, limits)
  vtgj(tileUri, {tiles: tiles})
  .on('data', function (data) {
    var exp = expected.shift()
    // hack - only check the beginning of the coordinates, because vt
    // simplification does funny things with the end.
    exp.geometry.coordinates[0] = exp.geometry.coordinates[0].slice(0, 10)
    data.geometry.coordinates[0] = data.geometry.coordinates[0].slice(0, 10)
    t.ok(eq.compare(exp.geometry, data.geometry))
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
