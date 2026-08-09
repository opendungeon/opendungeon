package messages

import (
	"encoding/binary"
	"errors"
	"fmt"
)

var (
	ErrInvalidMessageHeader = errors.New("invalid message header")
	ErrInvalidAck           = errors.New("invalid ack message")
	ErrInvalidJoin          = errors.New("invalid join message")
	ErrInvalidLeave         = errors.New("invalid leave message")
	ErrInvalidChat          = errors.New("invalid chat message")
	ErrInvalidAnimate       = errors.New("invalid animate message")
	ErrInvalidMove          = errors.New("invalid move message")
	ErrBufferTooShort       = errors.New("buffer too short")
)

type MessageType uint8

const (
	MessageTypePing MessageType = iota + 0x0
	MessageTypeAck
	MessageTypeJoin
	MessageTypeLeave
	MessageTypeChat
	MessageTypeAnimate
	MessageTypeMove
)

type Message struct {
	ID     uint8
	SentAt int64
}

func BufferToMessageHeader(buf []byte) (Message, error) {
	if len(buf) < 9 {
		return Message{}, ErrInvalidMessageHeader
	}

	id := buf[0]
	sentAt := int64(binary.LittleEndian.Uint64(buf[1:9]))

	return Message{
		ID:     id,
		SentAt: sentAt,
	}, nil
}

type Ping struct {
	Message
}

func BufferToPing(buf []byte) (Ping, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Ping{}, err
	}

	return Ping{
		Message: header,
	}, nil
}

// Header, PromptID
type Ack struct {
	Message
	PromptID uint8
}

func BufferToAck(buf []byte) (Ack, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Ack{}, err
	}

	if len(buf) < 10 {
		return Ack{}, ErrInvalidAck
	}

	promptID := buf[9]

	return Ack{
		Message:  header,
		PromptID: promptID,
	}, nil
}

type Join struct {
	Message
	PlayerID   string
	PlayerName string
}

func BufferToJoin(buf []byte) (Join, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Join{}, err
	}

	if len(buf) < 10 {
		return Join{}, ErrInvalidJoin
	}

	playerID, err := bufferToString(buf, 9)
	if err != nil {
		return Join{}, err
	}

	playerName, err := bufferToString(buf, 10+len(playerID))
	if err != nil {
		return Join{}, err
	}

	return Join{
		Message:    header,
		PlayerID:   playerID,
		PlayerName: playerName,
	}, nil
}

type Leave struct {
	Message
	PlayerID string
}

func BufferToLeave(buf []byte) (Leave, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Leave{}, err
	}

	if len(buf) < 10 {
		return Leave{}, ErrInvalidLeave
	}

	playerID, err := bufferToString(buf, 9)
	if err != nil {
		return Leave{}, err
	}

	return Leave{
		Message:  header,
		PlayerID: playerID,
	}, nil
}

type Chat struct {
	Message
	PlayerID string
	Content  string
}

func BufferToChat(buf []byte) (Chat, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Chat{}, err
	}

	if len(buf) < 10 {
		return Chat{}, ErrInvalidChat
	}

	playerID, err := bufferToString(buf, 9)
	if err != nil {
		return Chat{}, err
	}

	content, err := bufferToString(buf, 10+len(playerID))
	if err != nil {
		return Chat{}, err
	}

	return Chat{
		Message:  header,
		PlayerID: playerID,
		Content:  content,
	}, nil
}

type Animate struct {
	Message
	AnimationID string
}

func BufferToAnimate(buf []byte) (Animate, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Animate{}, err
	}

	if len(buf) < 10 {
		return Animate{}, ErrInvalidAnimate
	}

	animationID, err := bufferToString(buf, 9)
	if err != nil {
		return Animate{}, err
	}

	return Animate{
		Message:     header,
		AnimationID: animationID,
	}, nil

}

type Move struct {
	Message
	PlayerID string
	Q        uint8
	R        uint8
}

func BufferToMove(buf []byte) (Move, error) {
	header, err := BufferToMessageHeader(buf[0:9])
	if err != nil {
		return Move{}, err
	}

	if len(buf) < 10 {
		return Move{}, ErrInvalidMove
	}

	playerID, err := bufferToString(buf, 9)
	if err != nil {
		return Move{}, err
	}

	if len(buf) < 10+len(playerID)+2 {
		return Move{}, ErrInvalidMove
	}

	q := uint8(buf[10+len(playerID)])
	r := uint8(buf[11+len(playerID)])

	return Move{
		Message:  header,
		PlayerID: playerID,
		Q:        q,
		R:        r,
	}, nil
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
