package storage

import "os"

var root *os.Root

func Init(storagePath string) error {
	var err error

	root, err = os.OpenRoot(storagePath)
	if err != nil {
		return err
	}

	return nil
}

func Create(name string) (*os.File, error) {
	return root.Create(name)
}

func Open(name string) (*os.File, error) {
	return root.Open(name)
}

func Remove(name string) error {
	return root.Remove(name)
}
