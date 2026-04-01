package grid

import (
	"math"
	"slices"
	"strings"

	"github.com/gammazero/deque"
)

type HexGrid struct {
	cells [][]Cell
}

func NewHex(w, h uint8) *HexGrid {
	var cells [][]Cell

	for row := range h {
		cells = append(cells, make([]Cell, 0, int(w)))
		for col := range w {
			r := row
			q := int8(col) - int8(math.Floor(float64(row)/2))
			c := Cell{R: r, Q: q, Terrain: TerrainDefault}
			cells[row] = append(cells[row], c)
		}
	}

	return &HexGrid{cells}
}

func (hg *HexGrid) At(q int8, r uint8) *Cell {
	if len(hg.cells) <= int(r) {
		return nil
	}

	for i, cell := range hg.cells[r] {
		if cell.Q == q {
			return &hg.cells[r][i]
		}
	}

	return nil
}

type fmtRow struct {
	StartingQ *int8
	S         string
}

func (hg *HexGrid) String() string {
	if len(hg.cells) == 0 {
		return ""
	}

	fr := make([]fmtRow, 0, len(hg.cells))
	minQ := int8(0)

	for i, row := range hg.cells {
		var startingQ *int8
		s := new(strings.Builder)
		for j, c := range row {
			if j == 0 {
				q := c.Q + int8(math.Floor(float64(i)/2))
				startingQ = &q

				if q < minQ {
					minQ = c.Q
				}
			}

			cellStr := "⬡ "
			if c.Terrain == TerrainNone {
				cellStr = "  "
			}

			_, err := s.WriteString(cellStr)
			if err != nil {
				panic("cannot write hexagon to string")
			}
		}

		fr = append(fr, fmtRow{StartingQ: startingQ, S: strings.TrimRight(s.String(), " ")})
	}

	message := new(strings.Builder)
	for rowIdx, row := range fr {
		if row.StartingQ == nil {
			continue
		}

		isOffset := rowIdx%2 == 1
		d := *row.StartingQ - minQ

		wsLen := 2 * d
		if isOffset {
			wsLen++
		}

		ws := strings.Repeat(" ", int(wsLen))
		if _, err := message.WriteString(ws + row.S + "\n"); err != nil {
			panic("cannot write hexagon to string")
		}
	}

	return message.String()
}

func (hg *HexGrid) Distance(q1 int8, r1 uint8, q2 int8, r2 uint8) int {
	if hg.At(q1, r1) == nil {
		return -1
	}

	if hg.At(q2, r2) == nil {
		return -1
	}

	qDist := math.Abs(float64(q1) - float64(q2))
	sDist := math.Abs(float64(q1) + float64(r1) - float64(q2) - float64(r2))
	rDist := math.Abs(float64(r1) - float64(r2))
	return int((qDist + sDist + rDist) / 2)
}

func (hg *HexGrid) ShortestPath(start, goal Point) ([]Point, error) {
	startCell := hg.At(start.Q, start.R)
	goalCell := hg.At(goal.Q, goal.R)

	if (startCell != nil && startCell.Terrain == TerrainNone) ||
		(goalCell != nil && goalCell.Terrain == TerrainNone) {
		return nil, ErrNoValidPath
	}

	frontier := new(deque.Deque[Point])
	frontier.PushBack(start)
	cameFrom := map[Point]Point{}
	cameFrom[start] = start

	for frontier.Len() != 0 {
		current := frontier.PopFront()
		if current == goal {
			var path []Point
			for current != start {
				path = append(path, current)
				current = cameFrom[current]
			}

			slices.Reverse(path)
			return path, nil
		}

		for _, next := range current.Neighbors() {
			cell := hg.At(next.Q, next.R)
			if cell == nil || cell.Terrain == TerrainNone {
				continue
			}

			if _, exists := cameFrom[next]; !exists {
				frontier.PushBack(next)
				cameFrom[next] = current
			}
		}
	}

	return nil, ErrNoValidPath
}
