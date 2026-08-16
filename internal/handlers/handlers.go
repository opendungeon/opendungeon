package handlers

import "errors"

var (
	ErrUserCreationDisabled = errors.New("user creation disabled")
	ErrEncryptionFailure    = errors.New("encryption failed")
	ErrCheckViolation       = errors.New("check constraint violated")
	ErrUniqueViolation      = errors.New("unique constraint violated")
	ErrForeignKeyViolation  = errors.New("foreign key violated")
	ErrDatabaseFailure      = errors.New("database failed")
	ErrNotFound             = errors.New("not found")
	ErrThirdPartyFailure    = errors.New("third party failed")
	ErrValidationFailure    = errors.New("validation failed")
	ErrUnsupportedFormat    = errors.New("unsupported format")
	ErrStorageFailure       = errors.New("storage failed")
	ErrInvalidRequestFormat = errors.New("invalid request format")
	ErrConvertFailure       = errors.New("conversion failed")
	ErrRoomFailure          = errors.New("room failed")
)
