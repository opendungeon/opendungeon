package messages_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/opendungeon/opendungeon/internal/messages"
	"github.com/opendungeon/opendungeon/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBufferToAck(t *testing.T) {
	ValidAckMessage := messages.Ack{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PromptID: 0,
		Accepted: false,
	}
	ValidAckMessageBuf := []byte{1, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 0}

	t.Run("valid ack message", func(t *testing.T) {
		ackMessage, err := messages.BufferToAck(ValidAckMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidAckMessage, ackMessage)
	})
}

func TestAckToBuffer(t *testing.T) {
	ValidAckMessage := messages.Ack{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PromptID: 0,
		Accepted: false,
	}
	ValidAckMessageBuf := []byte{1, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 0}

	t.Run("valid ack message", func(t *testing.T) {
		ackMessageBuf := ValidAckMessage.ToBuffer()
		assert.Equal(t, ValidAckMessageBuf, ackMessageBuf)
	})
}

func TestBufferToJoin(t *testing.T) {
	ValidJoinMessage := messages.Join{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID:   "10c7850f-b24c-4496-bbee-f7ff68885064",
		PlayerName: "johndoe",
	}
	ValidJoinMessageBuf := []byte{2, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 7, 'j', 'o', 'h', 'n', 'd', 'o', 'e'}

	t.Run("valid join message", func(t *testing.T) {
		joinMessage, err := messages.BufferToJoin(ValidJoinMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidJoinMessage, joinMessage)
	})
}

func TestJoinToBuffer(t *testing.T) {
	ValidJoinMessage := messages.Join{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID:   "10c7850f-b24c-4496-bbee-f7ff68885064",
		PlayerName: "johndoe",
	}
	ValidJoinMessageBuf := []byte{2, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 7, 'j', 'o', 'h', 'n', 'd', 'o', 'e'}

	t.Run("valid join message to buffer", func(t *testing.T) {
		joinMessageBuf := ValidJoinMessage.ToBuffer()
		assert.Equal(t, ValidJoinMessageBuf, joinMessageBuf)
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
	ValidLeaveMessageBuf := []byte{3, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid leave message", func(t *testing.T) {
		leaveMessage, err := messages.BufferToLeave(ValidLeaveMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidLeaveMessage, leaveMessage)
	})
}

func TestLeaveToBuffer(t *testing.T) {
	ValidLeaveMessage := messages.Leave{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	ValidLeaveMessageBuf := []byte{3, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid leave message to buffer", func(t *testing.T) {
		leaveMessageBuf := ValidLeaveMessage.ToBuffer()
		assert.Equal(t, ValidLeaveMessageBuf, leaveMessageBuf)
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
	ValidChatMessageBuf := []byte{4, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 0x0b, 0x00, 0x00, 0x00, 'h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'}

	t.Run("valid chat message", func(t *testing.T) {
		chatMessage, err := messages.BufferToChat(ValidChatMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidChatMessage, chatMessage)
	})
}

func TestChatToBuffer(t *testing.T) {
	ValidChatMessage := messages.Chat{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		PlayerID: "10c7850f-b24c-4496-bbee-f7ff68885064",
		Content:  "hello world",
	}
	ValidChatMessageBuf := []byte{4, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4', 0x0b, 0x00, 0x00, 0x00, 'h', 'e', 'l', 'l', 'o', ' ', 'w', 'o', 'r', 'l', 'd'}

	t.Run("valid chat message to buffer", func(t *testing.T) {
		chatMessageBuf := ValidChatMessage.ToBuffer()
		assert.Equal(t, ValidChatMessageBuf, chatMessageBuf)
	})
}

func TestBufferToAnimate(t *testing.T) {
	ValidAnimateMessage := messages.Animate{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		CharacterID: 0,
		AnimationID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	ValidAnimateMessageBuf := []byte{5, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid animate message", func(t *testing.T) {
		animateMessage, err := messages.BufferToAnimate(ValidAnimateMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidAnimateMessage, animateMessage)
	})
}

func TestAnimateToBuffer(t *testing.T) {
	ValidAnimateMessage := messages.Animate{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		CharacterID: 0,
		AnimationID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	ValidAnimateMessageBuf := []byte{5, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid animate message to buffer", func(t *testing.T) {
		animateMessageBuf := ValidAnimateMessage.ToBuffer()
		assert.Equal(t, ValidAnimateMessageBuf, animateMessageBuf)
	})
}

func TestBufferToMove(t *testing.T) {
	ValidMoveMessage := messages.Move{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		CharacterID: 0,
		Q:           1,
		R:           2,
	}
	ValidMoveMessageBuf := []byte{6, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 1, 2}

	t.Run("valid move message", func(t *testing.T) {
		moveMessage, err := messages.BufferToMove(ValidMoveMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, ValidMoveMessage, moveMessage)
	})
}

func TestMoveToBuffer(t *testing.T) {
	ValidMoveMessage := messages.Move{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		CharacterID: 0,
		Q:           1,
		R:           2,
	}
	ValidMoveMessageBuf := []byte{6, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0, 1, 2}

	t.Run("valid move message to buffer", func(t *testing.T) {
		moveMessageBuf := ValidMoveMessage.ToBuffer()
		assert.Equal(t, ValidMoveMessageBuf, moveMessageBuf)
	})
}

func TestSync(t *testing.T) {
	validSyncMessage := messages.Sync{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		Data: models.Room{
			Players: map[uuid.UUID]string{
				uuid.Nil: "johndoe",
			},
			Level: nil,
		},
	}

	validSyncMessageBuf := []byte{byte(messages.MessageTypeSync), 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 0x4B, 0x00, 0x00, 0x00, 123, 34, 112, 108, 97, 121, 101, 114, 115, 34, 58, 123, 34, 48, 48, 48, 48, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 45, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 34, 58, 34, 106, 111, 104, 110, 100, 111, 101, 34, 125, 44, 34, 108, 101, 118, 101, 108, 34, 58, 110, 117, 108, 108, 125}

	t.Run("valid encode", func(t *testing.T) {
		t.Parallel()

		received := validSyncMessage.ToBuffer()
		assert.Equal(t, validSyncMessageBuf, received)
	})

	t.Run("valid decode", func(t *testing.T) {
		t.Parallel()

		received, err := messages.BufferToSync(validSyncMessageBuf)
		require.NoError(t, err)
		assert.Equal(t, validSyncMessage, received)
	})
}

func TestLoadLevel(t *testing.T) {
	validLoadLevelMessage := messages.LoadLevel{
		Message: messages.Message{
			ID:     0,
			SentAt: int64(1786295646),
		},
		LevelID: "10c7850f-b24c-4496-bbee-f7ff68885064",
	}
	validLoadLevelBuf := []byte{8, 0, 0x5e, 0xb5, 0x78, 0x6a, 0x00, 0x00, 0x00, 0x00, 36, '1', '0', 'c', '7', '8', '5', '0', 'f', '-', 'b', '2', '4', 'c', '-', '4', '4', '9', '6', '-', 'b', 'b', 'e', 'e', '-', 'f', '7', 'f', 'f', '6', '8', '8', '8', '5', '0', '6', '4'}

	t.Run("valid decode", func(t *testing.T) {
		loadLevelMessage, err := messages.BufferToLoadLevel(validLoadLevelBuf)
		require.NoError(t, err)
		assert.Equal(t, validLoadLevelMessage, loadLevelMessage)
	})

	t.Run("valid encode", func(t *testing.T) {
		loadLevelMessageBuf := validLoadLevelMessage.ToBuffer()
		assert.Equal(t, validLoadLevelBuf, loadLevelMessageBuf)
	})
}
