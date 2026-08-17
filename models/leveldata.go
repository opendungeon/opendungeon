package models

type Cell struct {
	Texture    int `json:"texture"`    // -1 indicates no texture is in use
	Decoration int `json:"decoration"` // -1 indicates no decoration in use
}

type LevelData struct {
	Version     int       `json:"version"`
	Textures    []string  `json:"textures"`
	Decorations []string  `json:"decorations"`
	Grid        [][]*Cell `json:"grid"`
}
