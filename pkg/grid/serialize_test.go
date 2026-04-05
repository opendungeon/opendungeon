package grid_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/pkg/grid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDeserialize(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		input := `{
  "version": 1,
  "grid": {
    "cells": [
      {
        "q": 0,
        "r": 0,
        "weight": 0
      }
    ]
  }
}`
		g, err := grid.Deserialize([]byte(input))
		require.NoError(t, err)
		cell := g.At(0, 0)
		assert.Equal(t, uint8(0), cell.Weight)
	})

	t.Run("invalid input", func(t *testing.T) {
		t.Parallel()

		input := `bad`

		_, err := grid.Deserialize([]byte(input))
		assert.Error(t, err)
	})
}
