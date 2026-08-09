package messages_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBufferToJoin(t *testing.T) {
	ValidJoinMessage := messages.Join{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID:   "10c7850f-b24c-4496-bbee-f7ff68885064",
		PlayerName: "johndoe",
	}
	ValidJoinMessageBuf := []byte{0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 7, 'j', 'o', 'h', 'n', 'd', 'o', 'e'}

	t.Run("valid join message", func(t *testing.T) {
		joinMessage, err := messages.BufferToJoin(ValidJoinMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidJoinMessage, joinMessage)
	})
}

func TestBufferToLeave(t *testing.T) {
	ValidLeaveMessage := messages.Leave{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	ValidLeaveMessageBuf := []byte{0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid leave message", func(t *testing.T) {
		leaveMessage, err := messages.BufferToLeave(ValidLeaveMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidLeaveMessage, leaveMessage)
	})
}

func TestBufferToChat(t *testing.T) {
	ValidChatMessage := messages.Chat{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
		Content:  "hello world",
	}
	ValidChatMessageBuf := []byte{0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 11, 'h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'}

	t.Run("valid chat message", func(t *testing.T) {
		chatMessage, err := messages.BufferToChat(ValidChatMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidChatMessage, chatMessage)
	})
}

func TestBufferToAnimate(t *testing.T) {
	ValidAnimateMessage := messages.Animate{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		AnimationID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	ValidAnimateMessageBuf := []byte{0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid animate message", func(t *testing.T) {
		animateMessage, err := messages.BufferToAnimate(ValidAnimateMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidAnimateMessage, animateMessage)
	})
}

func TestBufferToMove(t *testing.T) {
	ValidMoveMessage := messages.Move{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
		Q:        1,
		R:        2,
	}
	ValidMoveMessageBuf := []byte{0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 1, 2}

	t.Run("valid move message", func(t *testing.T) {
		moveMessage, err := messages.BufferToMove(ValidMoveMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidMoveMessage, moveMessage)
	})
}
