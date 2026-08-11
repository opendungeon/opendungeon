package messages

import "time"

type LoadLevel struct {
	Header
	LevelID string
}

func NewLoadLevel(id uint8, sentAt time.Time, levelID string) *LoadLevel {
	return &LoadLevel{
		Header:  NewHeader(MessageTypeLoadLevel, id, sentAt.Unix()),
		LevelID: levelID,
	}
}

func DecodeLoadLevel(b []byte) (*LoadLevel, error) {
	header, err := DecodeHeader(b)
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

func (l *LoadLevel) Encode() []byte {
	var b []byte
	b = append(b, l.Header.Encode()...)
	b = append(b, uint8(len(l.LevelID)))
	b = append(b, []byte(l.LevelID)...)

	return b
}
