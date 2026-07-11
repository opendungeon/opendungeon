package env

import (
	"errors"
	"fmt"
	"os"
)

var (
	ErrInvalidEnvFile      = errors.New("invalid env file")
	ErrMissingVariable     = errors.New("missing environment variable")
	ErrMissingEnvAndSecret = errors.New("missing environment variable and secret file")
	ErrMissingSecretFile   = errors.New("secret file does not exist")
)

func Fallback(name, fallback string) string {
	value, err := Get(name)
	if err != nil {
		return fallback
	}

	return value
}

func Get(name string) (string, error) {
	value, exists := os.LookupEnv(name)
	if !exists {
		return "", fmt.Errorf(`%w: "%s"`, ErrMissingVariable, name)
	}

	return value, nil
}

func GetOrSecret(name string) (string, error) {
	value, err := Get(name)
	if err == nil {
		return value, nil
	}

	file, err := Get(name + "_FILE")
	if err != nil {
		return "", ErrMissingEnvAndSecret
	}

	b, err := os.ReadFile(file)
	if err != nil {
		return "", ErrMissingSecretFile
	}

	return string(b), nil
}

func Must(value string, err error) string {
	if err != nil {
		panic(err)
	}

	return value
}
