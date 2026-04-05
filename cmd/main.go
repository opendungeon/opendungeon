package main

import (
	"fmt"

	"github.com/opendungeon/opendungeon/pkg/grid"
)

func main() {
	fmt.Println("Hello, OpenDungeon!")

	hg := grid.NewHex(5, 5)

	path, err := hg.ShortestPath(grid.NewPoint(0, 0), grid.NewPoint(2, 4))
	if err != nil {
		panic(err)
	}

	for _, cell := range path {
		hg.At(cell.Q, cell.R).Weight = 0
	}

	fmt.Println(hg.String())
}
