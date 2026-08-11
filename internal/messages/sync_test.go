package messages_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSync(t *testing.T) {
	validSyncMessage := messages.NewSync(0, timestamp, models.Room{
		Players: map[uuid.UUID]string{
			uuid.Nil: "johndoe",
		},
		Level: nil,
	})
	validSyncMessageBuf := []byte{
		byte(messages.MessageTypeSync),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		0x4B, 0x00, 0x00, 0x00, 123, 34, 112, 108, 97, 121, 101, 114, 115, 34, 58, 123, 34, 48, 48, 48, 48, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 34, 58, 34, 106, 111, 104, 110, 100, 111, 101, 34, 125, 44, 34, 108, 101, 118, 101, 108, 34, 58, 110, 117, 108, 108, 125,
	}

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.DecodeSync(validSyncMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validSyncMessage, received)
	})

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validSyncMessage.Encode()
		assert.Equal(t, validSyncMessageBuf, received)
	})
}
