package messages

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/opendungeon/opendungeon/models"
)

var (
	ErrInvalidMessageHeader = errors.New("invalid message header")
	ErrInvalidAck           = errors.New("invalid ack message")
	ErrInvalidJoin          = errors.New("invalid join message")
	ErrInvalidLeave         = errors.New("invalid leave message")
	ErrInvalidChat          = errors.New("invalid chat message")
	ErrInvalidAnimate       = errors.New("invalid animate message")
	ErrInvalidMove          = errors.New("invalid move message")
	ErrInvalidSync          = errors.New("invalid sync message")
	ErrInvalidLoadLevel     = errors.New("invalid load level message")
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
	MessageTypeSync
	MessageTypeLoadLevel
)

const HeaderSize = 10

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
	var buf []byte
	buf = append(buf, byte(MessageTypePing))
	buf = append(buf, p.HeaderToBuffer()...)
	return buf
}

func BufferToPing(buf []byte) (Ping, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
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
	Accepted bool
}

func (a *Ack) ToBuffer() []byte {
	var buf []byte
	buf = append(buf, byte(MessageTypeAck))
	buf = append(buf, a.HeaderToBuffer()...)
	buf = append(buf, a.PromptID)
	if a.Accepted {
		buf = append(buf, 1)
	} else {
		buf = append(buf, 0)
	}

	return buf
}

func BufferToAck(buf []byte) (Ack, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Ack{}, err
	}

	if len(buf) < HeaderSize+2 {
		return Ack{}, ErrInvalidAck
	}

	promptID := buf[HeaderSize]

	return Ack{
		Message:  header,
		PromptID: promptID,
		Accepted: buf[HeaderSize+1] == 1,
	}, nil
}

type Join struct {
	Message
	PlayerID   string
	PlayerName string
}

func (j *Join) ToBuffer() []byte {
	var buf []byte
	buf = append(buf, byte(MessageTypeJoin))
	buf = append(buf, j.HeaderToBuffer()...)
	buf = append(buf, uint8(len(j.PlayerID)))
	buf = append(buf, []byte(j.PlayerID)...)
	buf = append(buf, uint8(len(j.PlayerName)))
	buf = append(buf, []byte(j.PlayerName)...)

	return buf
}

func BufferToJoin(buf []byte) (Join, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Join{}, err
	}

	if len(buf) < HeaderSize+1 {
		return Join{}, ErrInvalidJoin
	}

	playerID, err := bufferToString(buf, HeaderSize)
	if err != nil {
		return Join{}, err
	}

	playerName, err := bufferToString(buf, HeaderSize+1+len(playerID))
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
	var buf []byte
	buf = append(buf, byte(MessageTypeLeave))
	buf = append(buf, l.HeaderToBuffer()...)
	buf = append(buf, uint8(len(l.PlayerID)))
	buf = append(buf, []byte(l.PlayerID)...)

	return buf
}

func BufferToLeave(buf []byte) (Leave, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Leave{}, err
	}

	if len(buf) < HeaderSize+1 {
		return Leave{}, ErrInvalidLeave
	}

	playerID, err := bufferToString(buf, HeaderSize)
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
	var buf []byte
	buf = append(buf, byte(MessageTypeChat))
	buf = append(buf, c.HeaderToBuffer()...)
	buf = append(buf, uint8(len(c.PlayerID)))
	buf = append(buf, []byte(c.PlayerID)...)
	contentLen := make([]byte, 4)
	binary.LittleEndian.PutUint32(contentLen, uint32(len(c.Content)))
	buf = append(buf, contentLen...)
	buf = append(buf, []byte(c.Content)...)

	return buf
}

func BufferToChat(buf []byte) (Chat, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Chat{}, err
	}

	if len(buf) < HeaderSize+1 {
		return Chat{}, ErrInvalidChat
	}

	playerID, err := bufferToString(buf, HeaderSize)
	if err != nil {
		return Chat{}, err
	}

	content, err := bufferToLongString(buf, HeaderSize+1+len(playerID))
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
	CharacterID uint8
	AnimationID string
}

func (a *Animate) ToBuffer() []byte {
	var buf []byte
	buf = append(buf, byte(MessageTypeAnimate))
	buf = append(buf, a.HeaderToBuffer()...)
	buf = append(buf, a.CharacterID)
	buf = append(buf, uint8(len(a.AnimationID)))
	buf = append(buf, []byte(a.AnimationID)...)

	return buf
}

func BufferToAnimate(buf []byte) (Animate, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Animate{}, err
	}

	if len(buf) < HeaderSize+1 {
		return Animate{}, ErrInvalidAnimate
	}

	characterID := buf[HeaderSize]

	if len(buf) < HeaderSize+2 {
		return Animate{}, ErrInvalidAnimate
	}

	animationID, err := bufferToString(buf, HeaderSize+1)
	if err != nil {
		return Animate{}, err
	}

	return Animate{
		Message:     header,
		CharacterID: characterID,
		AnimationID: animationID,
	}, nil

}

type Move struct {
	Message
	CharacterID uint8
	Q           uint8
	R           uint8
}

func (m *Move) ToBuffer() []byte {
	var buf []byte
	buf = append(buf, byte(MessageTypeMove))
	buf = append(buf, m.HeaderToBuffer()...)
	buf = append(buf, m.CharacterID)
	buf = append(buf, m.Q)
	buf = append(buf, m.R)

	return buf
}

func BufferToMove(buf []byte) (Move, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return Move{}, err
	}

	if len(buf) < HeaderSize+1 {
		return Move{}, ErrInvalidMove
	}

	characterID := uint8(buf[HeaderSize])

	if len(buf) < HeaderSize+3 {
		return Move{}, ErrInvalidMove
	}

	q := uint8(buf[HeaderSize+1])
	r := uint8(buf[HeaderSize+2])

	return Move{
		Message:     header,
		CharacterID: characterID,
		Q:           q,
		R:           r,
	}, nil
}

type Sync struct {
	Message
	Data models.Room
}

func (s *Sync) ToBuffer() []byte {
	data, err := json.Marshal(s.Data)
	if err != nil {
		panic(err)
	}

	dataLen := make([]byte, 4)
	binary.LittleEndian.PutUint32(dataLen, uint32(len(data)))

	var buf []byte
	buf = append(buf, byte(MessageTypeSync))
	buf = append(buf, s.HeaderToBuffer()...)
	buf = append(buf, dataLen...)
	buf = append(buf, data...)

	return buf
}

func BufferToSync(b []byte) (Sync, error) {
	header, err := BufferToMessageHeader(b[1:])
	if err != nil {
		return Sync{}, err
	}

	str, err := bufferToLongString(b, HeaderSize)
	if err != nil {
		return Sync{}, err
	}

	var data models.Room
	if err := json.Unmarshal([]byte(str), &data); err != nil {
		return Sync{}, fmt.Errorf("%w: invalid room data", ErrInvalidSync)
	}

	return Sync{
		Message: header,
		Data:    data,
	}, nil
}

type LoadLevel struct {
	Message
	LevelID string
}

func (l *LoadLevel) ToBuffer() []byte {
	var buf []byte
	buf = append(buf, byte(MessageTypeLoadLevel))
	buf = append(buf, l.HeaderToBuffer()...)
	buf = append(buf, uint8(len(l.LevelID)))
	buf = append(buf, []byte(l.LevelID)...)

	return buf
}

func BufferToLoadLevel(buf []byte) (LoadLevel, error) {
	header, err := BufferToMessageHeader(buf[1:HeaderSize])
	if err != nil {
		return LoadLevel{}, err
	}

	if len(buf) < HeaderSize+1 {
		return LoadLevel{}, ErrInvalidLoadLevel
	}

	levelID, err := bufferToString(buf, HeaderSize)
	if err != nil {
		return LoadLevel{}, err
	}

	return LoadLevel{
		Message: header,
		LevelID: levelID,
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
