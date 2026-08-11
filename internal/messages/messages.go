package messages

import (
	"encoding/binary"
	"errors"
	"fmt"
)

var (
	ErrBufferTooShort         = errors.New("buffer too short")
	ErrUnsupportedMessageType = errors.New("message type is unsupported")
	ErrInvalidHeader          = errors.New("invalid message header")
	ErrInvalidAck             = errors.New("invalid ack message")
	ErrInvalidJoin            = errors.New("invalid join message")
	ErrInvalidLeave           = errors.New("invalid leave message")
	ErrInvalidChat            = errors.New("invalid chat message")
	ErrInvalidAnimate         = errors.New("invalid animate message")
	ErrInvalidMove            = errors.New("invalid move message")
	ErrInvalidSync            = errors.New("invalid sync message")
	ErrInvalidLoadLevel       = errors.New("invalid load level message")
)

type MessageType uint8

const (
	MessageTypeAck MessageType = iota + 0x0
	MessageTypeJoin
	MessageTypeLeave
	MessageTypeChat
	MessageTypeAnimate
	MessageTypeMove
	MessageTypeSync
	MessageTypeLoadLevel
)

type Message interface {
	Type() MessageType
	ID() uint8
	SentAt() int64
	Encode() []byte
}

func Decode(b []byte) (Message, error) {
	if len(b) < 1 {
		return nil, ErrBufferTooShort
	}

	switch MessageType(b[0]) {
	case MessageTypeAck:
		return DecodeAck(b)
	case MessageTypeJoin:
		return DecodeJoin(b)
	case MessageTypeLeave:
		return DecodeLeave(b)
	case MessageTypeChat:
		return DecodeChat(b)
	case MessageTypeAnimate:
		return DecodeAnimate(b)
	case MessageTypeMove:
		return DecodeMove(b)
	case MessageTypeSync:
		return DecodeSync(b)
	case MessageTypeLoadLevel:
		return DecodeLoadLevel(b)
	default:
		return nil, ErrUnsupportedMessageType
	}
}

func bufferToString(buf []byte, offset int) (string, error) {
	if len(buf) < offset {
		return "", errors.New("buffer too short for string length")
	}

	strLen := int(buf[offset])

	if len(buf) < offset+1+strLen {
		return "", fmt.Errorf("buffer too short for string content: %d, %d, %d, %d", len(buf), offset+1+strLen, offset, strLen)
	}
	str := string(buf[offset+1 : offset+1+strLen])
	return str, nil
}

func bufferToLongString(buf []byte, offset int) (string, error) {
	if len(buf) < offset {
		return "", errors.New("buffer too short for string length")
	}

	strLen := int(binary.LittleEndian.Uint32(buf[offset : offset+4]))

	if len(buf) < offset+4+strLen {
		return "", fmt.Errorf("buffer too short for string content: %d, %d, %d, %d", len(buf), offset+4+strLen, offset, strLen)
	}
	str := string(buf[offset+4 : offset+4+strLen])
	return str, nil
}
