package messages

import "time"

type Join struct {
	Header
	PlayerID   string
	PlayerName string
}

func NewJoin(id uint8, sentAt time.Time, playerID string, playerName string) *Join {
	return &Join{
		Header:     NewHeader(MessageTypeJoin, id, sentAt.Unix()),
		PlayerID:   playerID,
		PlayerName: playerName,
	}
}

func DecodeJoin(b []byte) (*Join, error) {
	header, err := DecodeHeader(b)
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidJoin
	}

	playerID, err := bufferToString(b, HeaderSize)
	if err != nil {
		return nil, err
	}

	playerName, err := bufferToString(b, HeaderSize+1+len(playerID))
	if err != nil {
		return nil, err
	}

	return &Join{
		Header:     header,
		PlayerID:   playerID,
		PlayerName: playerName,
	}, nil
}

func (j *Join) Encode() []byte {
	var b []byte
	b = append(b, j.Header.Encode()...)
	b = append(b, uint8(len(j.PlayerID)))
	b = append(b, []byte(j.PlayerID)...)
	b = append(b, uint8(len(j.PlayerName)))
	b = append(b, []byte(j.PlayerName)...)

	return b
}
