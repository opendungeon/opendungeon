package grid

import (
	"encoding/json"
)

type SerializedGrid struct {
	Version int `json:"version"`
	Grid    struct {
		Cells []Cell `json:"cells"`
	} `json:"grid"`
}

func Deserialize(b []byte) (*HexGrid, error) {
	var sg SerializedGrid
	if err := json.Unmarshal(b, &sg); err != nil {
		return nil, err
	}

	var cells [][]Cell
	cells = append(cells, []Cell{})
	currentRow := 0
	for i := 0; i < len(sg.Grid.Cells); i++ {
		currentCell := sg.Grid.Cells[i]
		if currentCell.R != uint8(currentRow) {
			cells = append(cells, []Cell{})
		}
		cells[len(cells)-1] = append(cells[len(cells)-1], currentCell)
	}

	hg := HexGrid{cells}

	return &hg, nil
}

func (hg *HexGrid) Serialize() ([]byte, error) {
	var sg SerializedGrid
	sg.Version = 1
	for _, row := range hg.cells {
		for _, cell := range row {
			sg.Grid.Cells = append(sg.Grid.Cells, cell)
		}
	}

	return json.Marshal(sg)
}
