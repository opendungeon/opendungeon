package messages

type LoadLevel struct {
	Header
	LevelID string
}

func DecodeLoadLevel(b []byte) (*LoadLevel, error) {
	header, err := DecodeHeader(b[1:HeaderSize])
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidLoadLevel
	}

	levelID, err := bufferToString(b, HeaderSize)
	if err != nil {
		return nil, err
	}

	return &LoadLevel{
		Header:  header,
		LevelID: levelID,
	}, nil
}

func (l *LoadLevel) Type() MessageType {
	return MessageTypeLoadLevel
}

func (l *LoadLevel) Encode() []byte {
	var b []byte
	b = append(b, byte(MessageTypeLoadLevel))
	b = append(b, l.Header.Encode()...)
	b = append(b, uint8(len(l.LevelID)))
	b = append(b, []byte(l.LevelID)...)

	return b
}
