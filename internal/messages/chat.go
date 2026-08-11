package messages

import "encoding/binary"

type Chat struct {
	Header
	PlayerID string
	Content  string
}

func DecodeChat(b []byte) (*Chat, error) {
	header, err := DecodeHeader(b[1:HeaderSize])
	if err != nil {
		return nil, err
	}

	if len(b) < HeaderSize+1 {
		return nil, ErrInvalidChat
	}

	playerID, err := bufferToString(b, HeaderSize)
	if err != nil {
		return nil, err
	}

	content, err := bufferToLongString(b, HeaderSize+1+len(playerID))
	if err != nil {
		return nil, err
	}

	return &Chat{
		Header:   header,
		PlayerID: playerID,
		Content:  content,
	}, nil
}

func (c *Chat) Type() MessageType {
	return MessageTypeChat
}

func (c *Chat) Encode() []byte {
	var b []byte
	b = append(b, byte(MessageTypeChat))
	b = append(b, c.Header.Encode()...)
	b = append(b, uint8(len(c.PlayerID)))
	b = append(b, []byte(c.PlayerID)...)
	contentLen := make([]byte, 4)
	binary.LittleEndian.PutUint32(contentLen, uint32(len(c.Content)))
	b = append(b, contentLen...)
	b = append(b, []byte(c.Content)...)

	return b
}
