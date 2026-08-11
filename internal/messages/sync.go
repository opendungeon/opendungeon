package messages

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"time"

	"github.com/opendungeon/opendungeon/models"
)

type Sync struct {
	Header
	Data models.Room
}

func NewSync(id uint8, sentAt time.Time, data models.Room) *Sync {
	return &Sync{
		Header: NewHeader(MessageTypeSync, id, sentAt.Unix()),
		Data:   data,
	}
}

func DecodeSync(b []byte) (*Sync, error) {
	header, err := DecodeHeader(b)
	if err != nil {
		return nil, err
	}

	str, err := bufferToLongString(b, HeaderSize)
	if err != nil {
		return nil, err
	}

	var data models.Room
	if err := json.Unmarshal([]byte(str), &data); err != nil {
		return nil, fmt.Errorf("%w: invalid room data", ErrInvalidSync)
	}

	return &Sync{
		Header: header,
		Data:   data,
	}, nil
}

func (s *Sync) Encode() []byte {
	data, err := json.Marshal(s.Data)
	if err != nil {
		panic(err)
	}

	dataLen := make([]byte, 4)
	binary.LittleEndian.PutUint32(dataLen, uint32(len(data)))

	var b []byte
	b = append(b, s.Header.Encode()...)
	b = append(b, dataLen...)
	b = append(b, data...)

	return b
}
