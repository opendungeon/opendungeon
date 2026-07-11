package env_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/internal/env"
	"github.com/stretchr/testify/assert"
)

func TestFallback(t *testing.T) {
	t.Run("ok found", func(t *testing.T) {
		name := "FALLBACK_EXAMPLE_FOUND"
		expect := "value"
		t.Setenv(name, expect)

		received := env.Fallback(name, "fallback")
		assert.Equal(t, expect, received)
	})

	t.Run("ok fallback", func(t *testing.T) {
		t.Parallel()

		name := "FALLBACK_EXAMPLE_FALLBACK"
		expect := "fallback"

		received := env.Fallback(name, expect)
		assert.Equal(t, expect, received)
	})
}

func TestGet(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		name := "GET_EXAMPLE_FOUND"
		expect := "value"
		t.Setenv(name, expect)

		received, err := env.Get(name)
		assert.NoError(t, err)
		assert.Equal(t, expect, received)
	})

	t.Run("missing", func(t *testing.T) {
		t.Parallel()

		name := "GET_EXAMPLE_MISSING"
		_, err := env.Get(name)
		assert.Error(t, err)
		assert.ErrorIs(t, err, env.ErrMissingVariable)
	})
}

func TestMust(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		name := "MUST_EXAMPLE"
		expect := "must value"
		t.Setenv(name, expect)

		received := env.Must(env.Get(name))
		assert.Equal(t, expect, received)
	})

	t.Run("panic", func(t *testing.T) {
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("expected panic")
			}
		}()

		env.Must(env.Get("NON_EXISTANT"))
	})
}
