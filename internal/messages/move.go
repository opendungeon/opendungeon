package messages

import "time"

type Move struct {
	Header
	CharacterID uint8
	Q           uint8
	R           uint8
}

func NewMove(id uint8, sentAt time.Time, characterID uint8, q uint8, r uint8) *Move {
	return &Move{
		Header:      NewHeader(MessageTypeMove, id, sentAt.Unix()),
		CharacterID: characterID,
		Q:           q,
		R:           r,
	}
}

func DecodeMove(b []byte) (*Move, error) {
	header, err := DecodeHeader(b)
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidMove
	}

	characterID := uint8(b[HeaderSize])

	if len(b) < HeaderSize+3 {
		return nil, ErrInvalidMove
	}

	q := uint8(b[HeaderSize+1])
	r := uint8(b[HeaderSize+2])

	return &Move{
		Header:      header,
		CharacterID: characterID,
		Q:           q,
		R:           r,
	}, nil
}

func (m *Move) Encode() []byte {
	var b []byte
	b = append(b, m.Header.Encode()...)
	b = append(b, m.CharacterID)
	b = append(b, m.Q)
	b = append(b, m.R)

	return b
}
