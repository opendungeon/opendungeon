package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestChat(t *testing.T) {
	validChatMessage := &messages.Chat{
		Header:   messages.NewHeader(0, 1786295646),
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
		Content:  "hello world",
	}
	validChatMessageBuf := []byte{
		byte(messages.MessageTypeChat),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4',
		0x0b, 0x00, 0x00, 0x00, 'h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd',
	}

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.DecodeChat(validChatMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validChatMessage, received)
	})

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validChatMessage.Encode()
		assert.Equal(t, validChatMessageBuf, received)
	})
}
