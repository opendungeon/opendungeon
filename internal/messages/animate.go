package messages

import "time"

type Animate struct {
	Header
	CharacterID uint8
	AnimationID string
}

func NewAnimate(id uint8, sentAt time.Time, characterID uint8, animationID string) *Animate {
	return &Animate{
		Header:      NewHeader(MessageTypeAnimate, id, sentAt.Unix()),
		CharacterID: characterID,
		AnimationID: animationID,
	}
}

func DecodeAnimate(b []byte) (*Animate, error) {
	header, err := DecodeHeader(b)
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

func (a *Animate) Encode() []byte {
	var b []byte
	b = append(b, a.Header.Encode()...)
	b = append(b, a.CharacterID)
	b = append(b, uint8(len(a.AnimationID)))
	b = append(b, []byte(a.AnimationID)...)

	return b
}
