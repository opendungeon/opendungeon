package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAnimate(t *testing.T) {
	validAnimateMessage := messages.NewAnimate(0, timestamp, 0, "10c7850f-b24c-4496-bbee-f7ff68885064")
	validAnimateMessageBuf := []byte{
		byte(messages.MessageTypeAnimate),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		0,
		36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4',
	}

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.DecodeAnimate(validAnimateMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validAnimateMessage, received)
	})

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validAnimateMessage.Encode()
		assert.Equal(t, validAnimateMessageBuf, received)
	})
}
