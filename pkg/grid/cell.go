package grid

type Terrain uint8

const (
	TerrainNone Terrain = iota
	TerrainDefault
)

type Cell struct {
	R       uint8
	Q       int8
	Terrain Terrain
}
