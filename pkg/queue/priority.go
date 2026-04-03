package queue

type priorityElement[T any] struct {
	value    T
	priority int
}

type Priority[T any] struct {
	elements []priorityElement[T]
}

func (p *Priority[T]) Len() int {
	return len(p.elements)
}

func (p *Priority[T]) Less(i, j int) bool {
	return p.elements[i].priority < p.elements[j].priority
}

func (p *Priority[T]) Swap(i, j int) {
	p.elements[i], p.elements[j] = p.elements[j], p.elements[i]
}

func (p *Priority[T]) Empty() bool {
	return len(p.elements) == 0
}

func (p *Priority[T]) Push(value T, priority int) {
	p.elements = append(p.elements, priorityElement[T]{value, priority})
	p.bubbleUp()
}

func (p *Priority[T]) Pop() (T, bool) {
	var value T

	if p.Empty() {
		return value, false
	}

	value = p.elements[0].value

	last := p.elements[len(p.elements)-1]
	p.elements[0] = last
	p.elements = p.elements[:len(p.elements)-1]
	p.pushDown()

	return value, true
}

func (p *Priority[T]) bubbleUp() {
	i := len(p.elements) - 1
	j := parent(i)
	for p.Less(i, j) {
		p.Swap(i, j)
		i = j
		j = parent(i)
	}
}

func (p *Priority[T]) pushDown() {
	n := len(p.elements)
	i := 0
	for {
		left := leftChild(i)
		right := rightChild(i)

		smallest := i
		if left < n && p.Less(left, smallest) {
			smallest = left
		}
		if right < n && p.Less(right, smallest) {
			smallest = right
		}

		if smallest == i {
			break
		}

		p.Swap(i, smallest)
		i = smallest
	}
}

func parent(i int) int {
	return (i - 1) / 2
}

func leftChild(i int) int {
	return 2*i + 1
}

func rightChild(i int) int {
	return 2*i + 2
}
