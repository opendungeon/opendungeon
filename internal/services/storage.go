package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"time"
)

const StorageName = "file-storage"

var (
	ErrKeyInUse = errors.New("key already in use")
)

type FileMetadata struct {
	Key         string    `json:"key"`
	ContentType string    `json:"contentType"`
	Size        int64     `json:"size"`
	CreatedAt   time.Time `json:"createdAt"`
}

type File struct {
	FileMetadata
	Content io.ReadCloser
}

func (f File) Read(p []byte) (n int, err error) {
	return f.Content.Read(p)
}

func (f File) Close() error {
	return f.Content.Close()
}

type Storage struct {
	dir *os.Root
}

func NewStorage(dir string) (*Storage, error) {
	root, err := os.OpenRoot(dir)
	if err != nil {
		return nil, err
	}

	return &Storage{dir: root}, nil
}

func (s *Storage) Start(ctx context.Context) error {
	return nil
}

func (s *Storage) String() string {
	return StorageName
}

func (s *Storage) State(ctx context.Context) (string, error) {
	entries, err := os.ReadDir(s.dir.Name())
	if err != nil {
		return "", err
	}

	fileCount := len(entries)
	dirSize := int64(0)
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			return "", err
		}

		dirSize += info.Size()
	}

	state := fmt.Sprintf("File count: %d, Directory size: %d", fileCount, dirSize)
	return state, nil
}

func (s *Storage) Terminate(ctx context.Context) error {
	return nil
}

func (s *Storage) CreateFile(key, contentType string, r io.Reader) (FileMetadata, error) {
	var meta FileMetadata
	meta.Key = key
	meta.ContentType = contentType

	fout, err := s.dir.Create(key)
	if err != nil {
		return meta, err
	}

	info, err := fout.Stat()
	if err != nil {
		return meta, err
	}

	fileExists := info.Size() != 0
	if fileExists {
		return meta, ErrKeyInUse
	}

	n, err := io.Copy(fout, r)
	_ = fout.Close()
	if err != nil {
		_ = s.dir.Remove(key)
		return meta, err
	}

	meta.Size = n
	meta.CreatedAt = time.Now()

	mb, err := json.Marshal(meta)
	if err != nil {
		_ = s.dir.Remove(key)
		return meta, err
	}

	if err := s.dir.WriteFile(key+".meta.json", mb, 0o666); err != nil {
		_ = s.dir.Remove(key)
		return meta, err
	}

	return meta, err
}

func (s *Storage) GetFile(key string) (File, error) {
	var f File

	mb, err := s.dir.ReadFile(key + ".meta.json")
	if err != nil {
		return f, err
	}

	if err := json.Unmarshal(mb, &f.FileMetadata); err != nil {
		return f, err
	}

	f.Content, err = s.dir.Open(key)
	return f, err
}

func (s *Storage) DeleteFile(key string) error {
	if err := s.dir.Remove(key); err != nil {
		return err
	}

	return s.dir.Remove(key + ".meta.json")
}
