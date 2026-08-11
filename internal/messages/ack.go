package messages

type Ack struct {
	Header
	PromptID uint8
	Accepted bool
}

func DecodeAck(b []byte) (*Ack, error) {
	header, err := DecodeHeader(b[1:HeaderSize])
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

func (a *Ack) Type() MessageType {
	return MessageTypeAck
}

func (a *Ack) Encode() []byte {
	var b []byte
	b = append(b, byte(MessageTypeAck))
	b = append(b, a.Header.Encode()...)
	b = append(b, a.PromptID)
	if a.Accepted {
		b = append(b, 1)
	} else {
		b = append(b, 0)
	}

	return b
}
