package messages

import "encoding/binary"

const HeaderSize = 10

type Header struct {
	id     uint8
	sentAt int64
}

func NewHeader(id uint8, sentAt int64) Header {
	return Header{id, sentAt}
}

func DecodeHeader(buf []byte) (Header, error) {
	if len(buf) < 9 {
		return Header{}, ErrInvalidHeader
	}

	id := buf[0]
	sentAt := int64(binary.LittleEndian.Uint64(buf[1:9]))

	return Header{
		id:     id,
		sentAt: sentAt,
	}, nil
}

func (h *Header) ID() uint8 {
	return h.id
}

func (h *Header) SentAt() int64 {
	return h.sentAt
}

func (h *Header) Encode() []byte {
	buf := make([]byte, 9)
	buf[0] = h.id
	binary.LittleEndian.PutUint64(buf[1:9], uint64(h.sentAt))

	return buf
}
