package models

type Cell struct {
	Texture    int `json:"texture,omitempty"`
	Decoration int `json:"decoration,omitempty"`
}

type LevelData struct {
	Version     int       `json:"version"`
	Textures    []string  `json:"textures"`
	Decorations []string  `json:"decorations"`
	Grid        [][]*Cell `json:"grid"`
}
