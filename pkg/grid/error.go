package grid

type GridError uint8

const ErrNoValidPath GridError = iota

func (ge GridError) Error() string {
	switch ge {
	case ErrNoValidPath:
		return "no valid path"
	}

	return "unknown error"
}
