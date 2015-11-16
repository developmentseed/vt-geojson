var fs = require('fs')
var path = require('path')
var cover = require('../lib/cover')
var vtgj = require('../')

var data = path.join(__dirname, '../test/data')

var tileUri = 'mbtiles://' + data + '/test.mbtiles'
var original = fs.readFileSync(data + '/original.geojson')
original = JSON.parse(original)

var limits = {
  min_zoom: 13,
  max_zoom: 13
}

var tiles = cover(original, limits)
vtgj(tileUri, { tiles: tiles })
.on('data', function (data) {
  console.log(data)
})
