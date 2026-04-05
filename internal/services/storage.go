package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

const StorageName = "file-storage"

type FileMetadata struct {
	ID          string    `json:"id"`
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
	dir string
}

func NewStorage(dir string) *Storage {
	return &Storage{dir}
}

func (s *Storage) Start(ctx context.Context) error {
	return nil
}

func (s *Storage) String() string {
	return StorageName
}

func (s *Storage) State(ctx context.Context) (string, error) {
	entries, err := os.ReadDir(s.dir)
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

func (s *Storage) CreateFile(contentType string, r io.Reader) (FileMetadata, error) {
	var meta FileMetadata
	meta.ID = uuid.NewString()
	meta.ContentType = contentType

	p := filepath.Join(s.dir, meta.ID)
	fout, err := os.Create(p)
	if err != nil {
		return meta, err
	}

	n, err := io.Copy(fout, r)
	_ = fout.Close()
	if err != nil {
		_ = os.Remove(p)
		return meta, err
	}

	meta.Size = n
	meta.CreatedAt = time.Now()

	mb, err := json.Marshal(meta)
	if err != nil {
		_ = os.Remove(p)
		return meta, err
	}

	if err := os.WriteFile(p+".meta.json", mb, 0o666); err != nil {
		_ = os.Remove(p)
		return meta, err
	}

	return meta, err
}

func (s *Storage) GetFile(id uuid.UUID) (File, error) {
	var f File

	p := filepath.Join(s.dir, id.String())
	mb, err := os.ReadFile(p + ".meta.json")
	if err != nil {
		return f, err
	}

	if err := json.Unmarshal(mb, &f.FileMetadata); err != nil {
		return f, err
	}

	f.Content, err = os.Open(p)
	return f, err
}

func (s *Storage) DeleteFile(id uuid.UUID) error {
	p := filepath.Join(s.dir, id.String())

	if err := os.Remove(p); err != nil {
		return err
	}

	return os.Remove(p + ".meta.json")
}
