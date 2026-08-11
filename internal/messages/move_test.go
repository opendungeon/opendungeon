package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMove(t *testing.T) {
	validMoveMessage := &messages.Move{
		Header:      messages.NewHeader(0, 1786295646),
		CharacterID: 0,
		Q:           1,
		R:           2,
	}
	validMoveMessageBuf := []byte{
		byte(messages.MessageTypeMove),
		0,
		0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00,
		0,
		1,
		2,
	}

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.DecodeMove(validMoveMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validMoveMessage, received)
	})

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validMoveMessage.Encode()
		assert.Equal(t, validMoveMessageBuf, received)
	})
}
