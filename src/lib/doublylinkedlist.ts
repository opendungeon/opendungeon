class DoublyLinkedListNode<T> {
  value: T;
  prev: DoublyLinkedListNode<T> | null;
  next: DoublyLinkedListNode<T> | null;

  constructor(value: T) {
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class DoublyLinkedList<T> {
  length: number;
  head: DoublyLinkedListNode<T> | null;
  tail: DoublyLinkedListNode<T> | null;

  constructor() {
    this.length = 0;
    this.head = null;
    this.tail = null;
  }

  append(value: T) {
    const node = new DoublyLinkedListNode(value);
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail!.next = node;
      node.prev = this.tail;
      this.tail = node;
    }

    this.length++;
  }

  pop(): T | null {
    if (!this.tail) {
      return null;
    }

    const removed = this.tail;

    if (this.length === 1) {
      this.head = null;
      this.tail = null;
    } else {
      this.tail = removed.prev!;
      this.tail.next = null;
      removed.prev = null;
    }

    this.length--;

    return removed.value;
  }

  shift(): T | null {
    if (!this.head) {
      return null;
    }

    const removed = this.head;

    if (this.length === 1) {
      this.head = null;
      this.tail = null;
    } else {
      this.head = removed.next!;
      this.head.prev = null;
      removed.next = null;
    }

    this.length--;

    return removed.value;
  }

  remove(index: number) {
    if (index === 0) {
      this.shift();
      return;
    } else if (index === this.length - 1) {
      this.pop();
      return;
    }

    let cursor = 0;
    for (let node = this.head; node; node = node?.next ?? null) {
      if (cursor === index) {
        if (node.prev) {
          node.prev.next = node.next;
        }
        if (node.next) {
          node.next.prev = node.prev;
        }
        this.length--;
        break;
      }

      cursor++;
    }
  }

  forEach(callback: (value: T, index: number) => void) {
    let cursor = 0;
    for (let node = this.head; node; node = node?.next ?? null) {
      callback(node.value, cursor);

      cursor++;
      node = node.next;
    }
  }
}
