# vt-geojson

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

[![Build Status](https://travis-ci.org/developmentseed/vt-geojson.svg)](https://travis-ci.org/developmentseed/vt-geojson)

Extract GeoJSON from Mapbox vector tiles.

# Usage

First `npm install vt-geojson` and then:

```javascript
var cover = require('tile-cover')
var vtGeoJson = require('vt-geojson')

var polygon = JSON.parse(fs.readFileSync('my-polygon.geojson'))
var source = 'tilejson+http://api.tiles.mapbox.com/v4/YOUR-MAPID?access_token=YOUR_MAPBOX_TOKEN'

// get an array of tiles ([x, y, z]) that we want to pull data from.
var tiles = cover.tiles(polygon.geometry, { min_zoom: 10, max_zoom: 12 })

// stream geojson from the chosen tiles:
vtGeoJson(source, tiles)
  .on('data', function (feature) {
    console.log("it's a GeoJSON feature!", feature.geometry.type, feature.properties)
  })
  .on('end', function () {
    console.log('all done')
  })
```

Read the [API docs](API.md)


## CLI

Install with `npm install -g vt-geojson`, and then:
```bash
cat bounding_polygon.geojson | vt-geojson tilejson+http://api.tiles.mapbox.com/v4/YOUR-MAPID?access_token=YOUR_MAPBOX_TOKEN minzoom maxzoom
vt-geojson tilejson+http://api.tiles.mapbox.com/v4/YOUR-MAPID?access_token=YOUR_MAPBOX_TOKEN minx miny maxx maxy
vt-geojson tilejson+http://api.tiles.mapbox.com/v4/YOUR-MAPID?access_token=YOUR_MAPBOX_TOKEN tilex tiley tilez
```
