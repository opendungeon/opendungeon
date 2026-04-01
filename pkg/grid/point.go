package grid

type Point struct {
	Q int8
	R uint8
}

func NewPoint(q int8, r uint8) Point {
	return Point{Q: q, R: r}
}

func (p Point) NorthEastNeighbor() Point {
	return Point{
		Q: p.Q + 1,
		R: p.R - 1,
	}
}

func (p Point) EastNeighbor() Point {
	return Point{
		Q: p.Q + 1,
		R: p.R,
	}
}

func (p Point) SouthEastNeighbor() Point {
	return Point{
		Q: p.Q,
		R: p.R + 1,
	}
}

func (p Point) SouthWestNeighbor() Point {
	return Point{
		Q: p.Q - 1,
		R: p.R + 1,
	}
}

func (p Point) WestNeighbor() Point {
	return Point{
		Q: p.Q - 1,
		R: p.R,
	}
}

func (p Point) NorthWestNeighbor() Point {
	return Point{
		Q: p.Q,
		R: p.R - 1,
	}
}

func (p Point) Neighbors() []Point {
	return []Point{
		p.NorthEastNeighbor(),
		p.EastNeighbor(),
		p.SouthEastNeighbor(),
		p.SouthWestNeighbor(),
		p.WestNeighbor(),
		p.NorthWestNeighbor(),
	}
}
