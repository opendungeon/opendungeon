package messages

import (
	"encoding/json"
	"fmt"
	"time"
	"uuid"

	"github.com/opendungeon/opendungeon/models"
)

type MessageType string

const (
	MessageTypeAck       MessageType = "ack"
	MessageTypeAnimate   MessageType = "animate"
	MessageTypeChat      MessageType = "chat"
	MessageTypeJoin      MessageType = "join"
	MessageTypeLeave     MessageType = "leave"
	MessageTypeLoadLevel MessageType = "loadlevel"
	MessageTypeMove      MessageType = "move"
	MessageTypePing      MessageType = "ping"
	MessageTypeSync      MessageType = "sync"
)

type Message interface {
	Type() MessageType
	ID() int
	SentAt() int64
	Encode() []byte
}

type Header struct {
	MessageType   MessageType `json:"type"`
	MessageID     int         `json:"id"`
	MessageSentAt int64       `json:"sentAt"`
}

func NewHeader(mt MessageType, id int) Header {
	return Header{
		MessageType:   mt,
		MessageID:     id,
		MessageSentAt: time.Now().Unix(),
	}
}

func (h Header) Type() MessageType {
	return h.MessageType
}

func (h Header) ID() int {
	return h.MessageID
}

func (h Header) SentAt() int64 {
	return h.MessageSentAt
}

type Ack struct {
	Header
	PromptID int  `json:"promptId"`
	Accepted bool `json:"accepted"`
}

func NewAck(id, promptID int, accepted bool) Ack {
	return Ack{
		Header:   NewHeader(MessageTypeAck, id),
		PromptID: promptID,
		Accepted: accepted,
	}
}

func (a Ack) Encode() []byte {
	b, _ := json.Marshal(a)
	return b
}

type Animate struct {
	Header
	CharacterID int       `json:"characterId"`
	AnimationID uuid.UUID `json:"animationId"`
}

func NewAnimate(id int, characterID int, animationID uuid.UUID) Animate {
	return Animate{
		Header:      NewHeader(MessageTypeAnimate, id),
		CharacterID: characterID,
		AnimationID: animationID,
	}
}

func (a Animate) Encode() []byte {
	b, _ := json.Marshal(a)
	return b
}

type Chat struct {
	Header
	PlayerID uuid.UUID `json:"playerId"`
	Content  string    `json:"content"`
}

func NewChat(id int, playerID uuid.UUID, content string) Chat {
	return Chat{
		Header:   NewHeader(MessageTypeChat, id),
		PlayerID: playerID,
		Content:  content,
	}
}

func (c Chat) Encode() []byte {
	b, _ := json.Marshal(c)
	return b
}

type Join struct {
	Header
	PlayerID   uuid.UUID `json:"playerId"`
	PlayerName string    `json:"playerName"`
}

func NewJoin(id int, playerID uuid.UUID, playerName string) Join {
	return Join{
		Header:     NewHeader(MessageTypeJoin, id),
		PlayerID:   playerID,
		PlayerName: playerName,
	}
}

func (j Join) Encode() []byte {
	b, _ := json.Marshal(j)
	return b
}

type Leave struct {
	Header
	PlayerID uuid.UUID `json:"playerId"`
}

func NewLeave(id int, playerID uuid.UUID) Leave {
	return Leave{
		Header:   NewHeader(MessageTypeLeave, id),
		PlayerID: playerID,
	}
}

func (l Leave) Encode() []byte {
	b, _ := json.Marshal(l)
	return b
}

type LoadLevel struct {
	Header
	LevelID uuid.UUID `json:"levelId"`
}

func NewLoadLevel(id int, levelID uuid.UUID) LoadLevel {
	return LoadLevel{
		Header:  NewHeader(MessageTypeLoadLevel, id),
		LevelID: levelID,
	}
}

func (ll LoadLevel) Encode() []byte {
	b, _ := json.Marshal(ll)
	return b
}

type Move struct {
	Header
	CharacterID int `json:"characterId"`
	X           int `json:"x"`
	Y           int `json:"y"`
}

func NewMove(id int, characterID, x, y int) Move {
	return Move{
		Header:      NewHeader(MessageTypeMove, id),
		CharacterID: characterID,
		X:           x,
		Y:           y,
	}
}

func (m Move) Encode() []byte {
	b, _ := json.Marshal(m)
	return b
}

type Ping struct {
	Header
	PlayerID uuid.UUID `json:"playerId"`
	X        int       `json:"x"`
	Y        int       `json:"y"`
}

func NewPing(id int, playerID uuid.UUID, x, y int) Ping {
	return Ping{
		Header:   NewHeader(MessageTypePing, id),
		PlayerID: playerID,
		X:        x,
		Y:        y,
	}
}

func (p Ping) Encode() []byte {
	b, _ := json.Marshal(p)
	return b
}

type Sync struct {
	Header
	Data models.Room `json:"data"`
}

func NewSync(id int, data models.Room) Sync {
	return Sync{
		Header: NewHeader(MessageTypeSync, id),
		Data:   data,
	}
}

func (s Sync) Encode() []byte {
	b, _ := json.Marshal(s)
	return b
}

func Decode(b []byte) (Message, error) {
	var (
		h   Header
		msg Message
		err error
	)

	if err := json.Unmarshal(b, &h); err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}

	switch h.Type() {
	case MessageTypeAck:
		var ack Ack
		err = json.Unmarshal(b, &ack)
		msg = ack
	case MessageTypeAnimate:
		var animate Animate
		err = json.Unmarshal(b, &animate)
		msg = animate
	case MessageTypeChat:
		var chat Chat
		err = json.Unmarshal(b, &chat)
		msg = chat
	case MessageTypeJoin:
		var join Join
		err = json.Unmarshal(b, &join)
		msg = join
	case MessageTypeLeave:
		var leave Leave
		err = json.Unmarshal(b, &leave)
		msg = leave
	case MessageTypeLoadLevel:
		var loadlevel LoadLevel
		err = json.Unmarshal(b, &loadlevel)
		msg = loadlevel
	case MessageTypeMove:
		var move Move
		err = json.Unmarshal(b, &move)
		msg = move
	case MessageTypePing:
		var ping Ping
		err = json.Unmarshal(b, &ping)
		msg = ping
	case MessageTypeSync:
		var sync Sync
		err = json.Unmarshal(b, &sync)
		msg = sync
	}

	if err != nil {
		return nil, fmt.Errorf("failed to decode %s message: %w", h.Type(), err)
	}

	return msg, nil
}
