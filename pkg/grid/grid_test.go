package grid_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/pkg/grid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAt(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(7, 7)

		points := []struct {
			int8
			uint8
		}{
			{0, 0},
			{6, 0},
			{-3, 6},
			{3, 6},
		}

		for _, p := range points {
			cell := hg.At(p.int8, p.uint8)
			assert.NotNil(t, cell)
			assert.Equal(t, grid.TerrainDefault, cell.Terrain)
		}
	})

	t.Run("out of bounds", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(7, 7)

		points := []struct {
			int8
			uint8
		}{
			{-1, 0},
			{7, 0},
			{-4, 6},
			{-3, 7},
			{4, 6},
			{4, 7},
		}

		for _, p := range points {
			cell := hg.At(p.int8, p.uint8)
			assert.Nil(t, cell)
		}
	})
}

func TestString(t *testing.T) {
	t.Run("square", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(10, 10)

		expect := `⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡ ⬡
`

		assert.Equal(t, expect, hg.String())
	})

	t.Run("rectangle", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 10)

		expect := `⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
⬡ ⬡ ⬡ ⬡ ⬡
 ⬡ ⬡ ⬡ ⬡ ⬡
`

		assert.Equal(t, expect, hg.String())
	})
}

func TestDistance(t *testing.T) {
	t.Run("straight horizontal", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(10, 10)
		dist := hg.Distance(0, 0, 9, 0)
		assert.Equal(t, int(9), dist)
	})

	t.Run("straight diagonal", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(10, 10)
		dist := hg.Distance(0, 0, 5, 9)
		assert.Equal(t, int(14), dist)
	})
}

func TestShortestPath(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 5)

		path, err := hg.ShortestPath(grid.NewPoint(0, 0), grid.NewPoint(2, 4))
		require.NoError(t, err)
		assert.Equal(t, grid.NewPoint(1, 0), path[0])
		assert.Equal(t, grid.NewPoint(2, 0), path[1])
		assert.Equal(t, grid.NewPoint(2, 1), path[2])
		assert.Equal(t, grid.NewPoint(2, 2), path[3])
		assert.Equal(t, grid.NewPoint(2, 3), path[4])
		assert.Equal(t, grid.NewPoint(2, 4), path[5])
	})

	t.Run("obstructed simple", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 5)
		hg.At(2, 0).Terrain = grid.TerrainNone

		path, err := hg.ShortestPath(grid.NewPoint(0, 0), grid.NewPoint(2, 4))
		require.NoError(t, err)
		assert.Equal(t, grid.NewPoint(1, 0), path[0])
		assert.Equal(t, grid.NewPoint(1, 1), path[1])
		assert.Equal(t, grid.NewPoint(2, 1), path[2])
		assert.Equal(t, grid.NewPoint(2, 2), path[3])
		assert.Equal(t, grid.NewPoint(2, 3), path[4])
		assert.Equal(t, grid.NewPoint(2, 4), path[5])
	})

	t.Run("obstructed complex", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 5)
		hg.At(2, 0).Terrain = grid.TerrainNone
		hg.At(1, 2).Terrain = grid.TerrainNone
		hg.At(2, 2).Terrain = grid.TerrainNone
		hg.At(0, 3).Terrain = grid.TerrainNone
		hg.At(3, 3).Terrain = grid.TerrainNone

		path, err := hg.ShortestPath(grid.NewPoint(0, 0), grid.NewPoint(2, 4))
		require.NoError(t, err)
		assert.Equal(t, grid.NewPoint(1, 0), path[0])
		assert.Equal(t, grid.NewPoint(1, 1), path[1])
		assert.Equal(t, grid.NewPoint(2, 1), path[2])
		assert.Equal(t, grid.NewPoint(3, 1), path[3])
		assert.Equal(t, grid.NewPoint(3, 2), path[4])
		assert.Equal(t, grid.NewPoint(2, 3), path[5])
	})

	t.Run("impossible", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 5)
		hg.At(2, 3).Terrain = grid.TerrainNone
		hg.At(3, 3).Terrain = grid.TerrainNone
		hg.At(2, 4).Terrain = grid.TerrainNone

		_, err := hg.ShortestPath(grid.NewPoint(0, 0), grid.NewPoint(2, 4))
		assert.Error(t, err)
	})

	t.Run("invalid points", func(t *testing.T) {
		t.Parallel()

		hg := grid.NewHex(5, 5)
		_, err := hg.ShortestPath(grid.NewPoint(0, 6), grid.NewPoint(6, 0))
		assert.Error(t, err)
	})
}
