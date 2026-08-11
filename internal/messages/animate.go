package messages

type Animate struct {
	Header
	CharacterID uint8
	AnimationID string
}

func DecodeAnimate(b []byte) (*Animate, error) {
	header, err := DecodeHeader(b[1:HeaderSize])
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidAnimate
	}

	characterID := b[HeaderSize]

	if len(b) < HeaderSize+2 {
		return nil, ErrInvalidAnimate
	}

	animationID, err := bufferToString(b, HeaderSize+1)
	if err != nil {
		return nil, err
	}

	return &Animate{
		Header:      header,
		CharacterID: characterID,
		AnimationID: animationID,
	}, nil
}

func (a *Animate) Type() MessageType {
	return MessageTypeAnimate
}

func (a *Animate) Encode() []byte {
	var b []byte
	b = append(b, byte(MessageTypeAnimate))
	b = append(b, a.Header.Encode()...)
	b = append(b, a.CharacterID)
	b = append(b, uint8(len(a.AnimationID)))
	b = append(b, []byte(a.AnimationID)...)

	return b
}
