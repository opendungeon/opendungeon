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

func (m *Message) HeaderToBuffer() []byte {
	buf := make([]byte, 9)
	buf[0] = m.ID
	binary.LittleEndian.PutUint64(buf[1:9], uint64(m.SentAt))

	return buf
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

func (p *Ping) ToBuffer() []byte {
	return p.Message.HeaderToBuffer()
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

func (a *Ack) ToBuffer() []byte {
	buf := a.Message.HeaderToBuffer()
	buf = append(buf, a.PromptID)

	return buf
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

func (j *Join) ToBuffer() []byte {
	buf := j.Message.HeaderToBuffer()
	buf = append(buf, uint8(len(j.PlayerID)))
	buf = append(buf, []byte(j.PlayerID)...)
	buf = append(buf, uint8(len(j.PlayerName)))
	buf = append(buf, []byte(j.PlayerName)...)

	return buf
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

func (l *Leave) ToBuffer() []byte {
	buf := l.Message.HeaderToBuffer()
	buf = append(buf, uint8(len(l.PlayerID)))
	buf = append(buf, []byte(l.PlayerID)...)

	return buf
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

func (c *Chat) ToBuffer() []byte {
	buf := c.Message.HeaderToBuffer()
	buf = append(buf, uint8(len(c.PlayerID)))
	buf = append(buf, []byte(c.PlayerID)...)
	contentLen := make([]byte, 4)
	binary.LittleEndian.PutUint32(contentLen, uint32(len(c.Content)))
	buf = append(buf, contentLen...)
	buf = append(buf, []byte(c.Content)...)

	return buf
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

	content, err := bufferToLongString(buf, 10+len(playerID))
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

func (a *Animate) ToBuffer() []byte {
	buf := a.Message.HeaderToBuffer()
	buf = append(buf, uint8(len(a.AnimationID)))
	buf = append(buf, []byte(a.AnimationID)...)

	return buf
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

func (m *Move) ToBuffer() []byte {
	buf := m.Message.HeaderToBuffer()
	buf = append(buf, uint8(len(m.PlayerID)))
	buf = append(buf, []byte(m.PlayerID)...)
	buf = append(buf, m.Q)
	buf = append(buf, m.R)

	return buf
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
