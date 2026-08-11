package messages

import "time"

type Ack struct {
	Header
	PromptID uint8
	Accepted bool
}

func NewAck(id uint8, sentAt time.Time, promptID uint8, accepted bool) *Ack {
	return &Ack{
		Header:   NewHeader(MessageTypeAck, id, sentAt.Unix()),
		PromptID: promptID,
		Accepted: accepted,
	}
}

func DecodeAck(b []byte) (*Ack, error) {
	header, err := DecodeHeader(b)
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+2 {
		return nil, ErrInvalidAck
	}

	promptID := b[HeaderSize]

	return &Ack{
		Header:   header,
		PromptID: promptID,
		Accepted: b[HeaderSize+1] == 1,
	}, nil
}

func (a *Ack) Encode() []byte {
	var b []byte
	b = append(b, a.Header.Encode()...)
	b = append(b, a.PromptID)
	if a.Accepted {
		b = append(b, 1)
	} else {
		b = append(b, 0)
	}

	return b
}
