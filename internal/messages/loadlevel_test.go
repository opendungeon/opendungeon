package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadLevel(t *testing.T) {
	validLoadLevelMessage := messages.NewLoadLevel(0, timestamp, "10c7850f-b24c-4496-bbee-f7ff68885064")
	validLoadLevelBuf := []byte{
		byte(messages.MessageTypeLoadLevel),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4',
	}

	t.Run("valid decode", func(t *testing.T) {
		loadLevelMessage, err := messages.DecodeLoadLevel(validLoadLevelBuf)
		require.NoError(t, err)
		assert.Equal(t, validLoadLevelMessage, loadLevelMessage)
	})

	t.Run("valid encode", func(t *testing.T) {
		loadLevelMessageBuf := validLoadLevelMessage.Encode()
		assert.Equal(t, validLoadLevelBuf, loadLevelMessageBuf)
	})
}
