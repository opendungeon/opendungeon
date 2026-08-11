package messages

import "time"

type Leave struct {
	Header
	PlayerID string
}

func NewLeave(id uint8, sentAt time.Time, playerID string) *Leave {
	return &Leave{
		Header:   NewHeader(MessageTypeLeave, id, sentAt.Unix()),
		PlayerID: playerID,
	}
}

func DecodeLeave(b []byte) (*Leave, error) {
	header, err := DecodeHeader(b)
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidLeave
	}

	playerID, err := bufferToString(b, HeaderSize)
	if err != nil {
		return nil, err
	}

	return &Leave{
		Header:   header,
		PlayerID: playerID,
	}, nil
}

func (l *Leave) Encode() []byte {
	var b []byte
	b = append(b, l.Header.Encode()...)
	b = append(b, uint8(len(l.PlayerID)))
	b = append(b, []byte(l.PlayerID)...)

	return b
}
