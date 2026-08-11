package messages

import "encoding/binary"

const HeaderSize = 10

type Header struct {
	messageType MessageType
	id          uint8
	sentAt      int64
}

func NewHeader(messageType MessageType, id uint8, sentAt int64) Header {
	return Header{messageType, id, sentAt}
}

func DecodeHeader(buf []byte) (Header, error) {
	if len(buf) < HeaderSize {
		return Header{}, ErrInvalidHeader
	}

	messageType := MessageType(buf[0])
	id := buf[1]
	sentAt := int64(binary.LittleEndian.Uint64(buf[2:HeaderSize]))

	return Header{
		messageType: messageType,
		id:          id,
		sentAt:      sentAt,
	}, nil
}

func (h *Header) Type() MessageType {
	return h.messageType
}

func (h *Header) ID() uint8 {
	return h.id
}

func (h *Header) SentAt() int64 {
	return h.sentAt
}

func (h *Header) Encode() []byte {
	b := make([]byte, HeaderSize)
	b[0] = byte(h.messageType)
	b[1] = h.id
	binary.LittleEndian.PutUint64(b[2:HeaderSize], uint64(h.sentAt))

	return b
}
