package env_test

import (
	"fmt"
	"os"
	"strings"
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

func TestLoad(t *testing.T) {
	t.Run("ok", func(t *testing.T) {
		t.Parallel()

		name := "LOAD_EXAMPLE_OK"
		expect := "value"
		file := strings.NewReader(fmt.Sprintf("%s=%s", name, expect))

		err := env.Load(file)
		assert.NoError(t, err)

		received, exists := os.LookupEnv(name)
		assert.True(t, exists)
		assert.Equal(t, expect, received)
	})

	t.Run("ok empty line", func(t *testing.T) {
		t.Parallel()

		name := "LOAD_EXAMPLE_OK"
		expect := "value"
		file := strings.NewReader(fmt.Sprintf(`OTHER_ENV=value

		%s=%s`, name, expect))

		err := env.Load(file)
		assert.NoError(t, err)

		received, exists := os.LookupEnv(name)
		assert.True(t, exists)
		assert.Equal(t, expect, received)
	})

	t.Run("ok comment", func(t *testing.T) {
		t.Parallel()

		name := "LOAD_EXAMPLE_OK"
		expect := "value"
		file := strings.NewReader(fmt.Sprintf(`OTHER_ENV=value
		# this is a comment
		this%s=%s`, name, expect))

		err := env.Load(file)
		assert.NoError(t, err)

		received, exists := os.LookupEnv(name)
		assert.True(t, exists)
		assert.Equal(t, expect, received)
	})

	t.Run("ok single quoted", func(t *testing.T) {
		t.Parallel()

		name := "LOAD_EXAMPLE_OK"
		expect := "value"
		file := strings.NewReader(fmt.Sprintf(`%s='%s'`, name, expect))

		err := env.Load(file)
		assert.NoError(t, err)

		received, exists := os.LookupEnv(name)
		assert.True(t, exists)
		assert.Equal(t, expect, received)
	})

	t.Run("ok double quoted", func(t *testing.T) {
		t.Parallel()

		name := "LOAD_EXAMPLE_OK"
		expect := "value"
		file := strings.NewReader(fmt.Sprintf(`%s="%s"`, name, expect))

		err := env.Load(file)
		assert.NoError(t, err)

		received, exists := os.LookupEnv(name)
		assert.True(t, exists)
		assert.Equal(t, expect, received)
	})

	t.Run("invalid declaration", func(t *testing.T) {
		t.Parallel()

		file := strings.NewReader("INVALID_EXAMPLE=value=value")
		err := env.Load(file)

		assert.Error(t, err)
		assert.ErrorIs(t, err, env.ErrInvalidEnvFile)
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
