require('phantomjs-polyfill')
var fs = require('fs')
var test = require('tap').test
var vtgj = require('../')

test('warn on missing tile', function (t) {
  var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'

  var tile = [0, 0, 14]
  vtgj(tileUri, { tiles: [tile] })
  .on('data', function (data) {
    t.error(data) // should not get any data
  })
  .on('warning', function (info) {
    t.deepEqual(info.tile, tile)
    t.match(info.error.toString(), /Tile does not exist/)
    t.end()
  })
})

test('warn on tile reading error', function (t) {
  var tileUri = 'file://' + __dirname + '/data/bad-tile?filetype=pbf'

  t.plan(201) // 200 features + 1 warning

  var tile = [19087, 24820, 16]
  vtgj(tileUri, { tiles: [tile] })
  .on('data', function (data) {
    t.ok(data, 'parsed feature')
  })
  .on('warning', function (info) {
    t.deepEqual(info.tile, tile, 'tile read error')
  })
  .on('end', function () {
    t.end()
  })
})

test('strict mode: error on missing tile', function (t) {
  var tileUri = 'mbtiles://' + __dirname + '/data/test.mbtiles'
  var original = fs.readFileSync(__dirname + '/data/original.geojson')
  original = JSON.parse(original)

  var tile = [0, 0, 14]
  vtgj(tileUri, { tiles: [tile], strict: true })
  .on('data', function (data) {
    t.error(data) // should not get any data
  })
  .on('error', function (error) {
    t.match(error.toString(), /Tile does not exist/)
    t.end()
  })
})

test('strict mode: error on tile reading error', function (t) {
  var tileUri = 'file://' + __dirname + '/data/bad-tile?filetype=pbf'

  t.plan(5) // 4 features before the error

  var tile = [19087, 24820, 16]
  vtgj(tileUri, { tiles: [tile], strict: true })
  .on('data', function (data) {
    t.ok(data, 'parsed feature')
  })
  .on('error', function (err) {
    t.match(err.toString(), /Error reading feature \d+ from layer \w+/, 'tile read error')
  })
  .on('end', function () {
    t.end()
  })
})

