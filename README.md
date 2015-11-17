# vt-geojson

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

[![Build Status](https://travis-ci.org/developmentseed/vt-geojson.svg)](https://travis-ci.org/developmentseed/vt-geojson)

Extract GeoJSON from Mapbox vector tiles.

# Usage

## CLI

Install with `npm install -g vt-geojson`, and then:

```bash
vt-geojson /path/to/tiles.mbtiles --bounds minx miny maxx maxy
cat bounding_polygon.geojson | vt-geojson tilejson+http://api.tiles.mapbox.com/v4/YOUR-MAPID?access_token=YOUR_MAPBOX_TOKEN -z 12
vt-geojson someone.blahblah --tile tilex tiley tilez # ('someone.blahblah' is a mapid)
```

## Node

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

## Browser

This module should work with browserify.  There's a minimal example of
using it in the browser
[here](https://github.com/developmentseed/vt-geojson/blob/master/example/browser.js).
Try it with:

    npm install -g budo
    budo example/browser.js

Then go to <http://localhost:9966/?mapid=mapbox.mapbox-streets-v6&tile=73/97/8&layers=road&access_token=YOUR_MAPBOX_ACCESS_TOKEN>

# API

## vtgeojson

Stream GeoJSON from a Mapbox Vector Tile source

**Parameters**

-   `uri` **string** the tilelive URI for the vector tile source to use.
-   `options` **object** options
    -   `options.layers` **Array&lt;string&gt;** An array of layer names to read from tiles.  If empty, read all layers
    -   `options.tiles` **Array** The tiles to read from the tilelive source.  If empty, use `options.bounds` instead.
    -   `options.bounds` **Array** The [minx, miny, maxx, maxy] bounds or a GeoJSON Feature, FeatureCollection, or Geometry defining the region to read from source. Ignored if `options.tiles` is set.  If empty, use the bounds from the input source's metadata.
    -   `options.minzoom` **number** Defaults to the source metadata minzoom.  Ignored if `options.tiles` is set.
    -   `options.maxzoom` **number** Defaults to the source metadata minzoom.  Ignored if `options.tiles` is set.
    -   `options.tilesOnly` **boolean** Output [z, y, x] tile coordinates instead of actually reading tiles.  Useful for debugging.
    -   `options.strict` **boolean** Emit an error and end the stream if a tile is not found or can't be read

Returns **ReadableStream&lt;Feature&gt;** A stream of GeoJSON Feature objects. Emits `warning` events with `{ tile, error }` when a tile from the requested set is not found or can't be read.

# [Contributing](CONTRIBUTING.md)

This is an [OPEN Open Source](http://openopensource.org/) Project. This means that:

Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.
