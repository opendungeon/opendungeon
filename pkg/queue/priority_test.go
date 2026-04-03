package queue_test

import (
	"testing"

	"github.com/opendungeon/opendungeon/pkg/queue"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewPriorityQueueIsEmpty(t *testing.T) {
	p := new(queue.Priority[int])
	if !p.Empty() {
		t.Fatal("new queue should be empty")
	}
	if p.Len() != 0 {
		t.Fatalf("new queue Len() = %d, want 0", p.Len())
	}
}

func TestPushAndPopSingleElement(t *testing.T) {
	p := new(queue.Priority[string])
	p.Push("hello", 1)

	if p.Empty() {
		t.Fatal("queue should not be empty after Push")
	}
	if p.Len() != 1 {
		t.Fatalf("Len() = %d, want 1", p.Len())
	}

	val, ok := p.Pop()
	if !ok {
		t.Fatal("Pop returned ok=false on non-empty queue")
	}
	if val != "hello" {
		t.Fatalf("Pop() = %q, want %q", val, "hello")
	}

	if !p.Empty() {
		t.Fatal("queue should be empty after popping only element")
	}
}

func TestPopFromEmptyQueue(t *testing.T) {
	p := new(queue.Priority[int])
	_, ok := p.Pop()
	if ok {
		t.Fatal("Pop on empty queue should return ok=false")
	}
}

func TestMinPriorityOrder(t *testing.T) {
	p := new(queue.Priority[string])
	p.Push("low", 10)
	p.Push("high", 1)
	p.Push("mid", 5)

	expected := []string{"high", "mid", "low"}
	for _, want := range expected {
		val, ok := p.Pop()
		require.True(t, ok)
		assert.Equal(t, want, val)
	}

	assert.True(t, p.Empty(), "queue should be empty")
}

func TestDuplicatePriorities(t *testing.T) {
	p := new(queue.Priority[int])
	p.Push(1, 5)
	p.Push(2, 5)
	p.Push(3, 5)

	seen := map[int]bool{}
	for range 3 {
		val, ok := p.Pop()
		require.True(t, ok)
		seen[val] = true
	}

	for _, v := range []int{1, 2, 3} {
		assert.True(t, seen[v], "missing value", v)
	}
}

func TestManyElements(t *testing.T) {
	p := new(queue.Priority[int])

	// Push 0..99 in reverse priority order.
	for i := 99; i >= 0; i-- {
		p.Push(i, i)
	}
	assert.Equal(t, 100, p.Len())

	for want := range 100 {
		val, ok := p.Pop()
		require.True(t, ok)
		assert.Equal(t, want, val)
	}
}
