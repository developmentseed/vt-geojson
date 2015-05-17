## `vectorTilesToGeoJSON`

Stream GeoJSON from a Mapbox Vector Tile source

### Parameters

| name | type | description |
| ---- | ---- | ----------- |
| `uri` | `String` | the tilelive URI for the vector tile source to use. |
| `tiles` | `Array` | The tiles to read from the tilelive source. Can be: an array of `[x, y, z]` tiles, a single `[x, y, z]` tile, a `[minx, miny, maxx, maxy]` bounding box, or omitted (will attempt to read entire extent of the tile source). |
| `layers` | `Array` | The layers to read from the tiles. If empty, read all layers. |



Returns  A stream of GeoJSON Feature objects.
Emits `warning` events with `{ tile, error }` when a tile from the
requested set is not found.

