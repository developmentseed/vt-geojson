var qs = require('querystring')
var vtgeojson = require('../')

// parse query string
var query = qs.parse(window.location.search.substring(1))
var token = query.access_token
var mapid = query.mapid
var tile = query.tile.split('/').map(Number)
var layers = query.layers

// grab vector tiles and make 'em into geojson
var featurecollection = { type: 'FeatureCollection', features: [] }
var tiles = 'tilejson+http://api.mapbox.com/v4/' + mapid + '.json?access_token=' + token
vtgeojson(tiles, {
  tiles: [tile],
  layers: layers ? layers.split(',') : undefined
})
.on('data', function (data) {
  featurecollection.features.push(data)
})
.on('end', function () {
  document.write('<pre>' + JSON.stringify(featurecollection, null, 2) + '</pre>')
})
