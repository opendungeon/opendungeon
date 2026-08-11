package messages

type Leave struct {
	Header
	PlayerID string
}

func DecodeLeave(b []byte) (*Leave, error) {
	header, err := DecodeHeader(b[1:HeaderSize])
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

func (l *Leave) Type() MessageType {
	return MessageTypeLeave
}

func (l *Leave) Encode() []byte {
	var b []byte
	b = append(b, byte(MessageTypeLeave))
	b = append(b, l.Header.Encode()...)
	b = append(b, uint8(len(l.PlayerID)))
	b = append(b, []byte(l.PlayerID)...)

	return b
}
