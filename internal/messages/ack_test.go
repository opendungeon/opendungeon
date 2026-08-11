package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAck(t *testing.T) {
	validAckMessage := messages.NewAck(0, timestamp, 0, false)
	validAckMessageBuf := []byte{
		byte(messages.MessageTypeAck),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		0,
		0,
	}

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.DecodeAck(validAckMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validAckMessage, received)
	})

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validAckMessage.Encode()
		assert.Equal(t, validAckMessageBuf, received)
	})
}
