import { describe, expect, test } from "vitest";
import { DoublyLinkedList } from "$lib/doublylinkedlist";

describe.concurrent("DoublyLinkedList", () => {
  test("append empty", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);

    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(1);
    expect(list.tail!.value).toBe(1);
    expect(list.length).toBe(1);
  });

  test("append non empty", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.append(2);

    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(1);
    expect(list.tail!.value).toBe(2);
    expect(list.length).toBe(2);
  });

  test("pop empty", () => {
    const list = new DoublyLinkedList<number>();
    const value = list.pop();
    expect(value).toBeNull();
    expect(list.length).toBe(0);
  });

  test("pop single", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    const value = list.pop();
    expect(value).toBe(1);
    expect(list.head).toBeNull();
    expect(list.tail).toBeNull();
    expect(list.length).toBe(0);
  });

  test("pop multi", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.append(2);
    const value = list.pop();
    expect(value).toBe(2);
    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(1);
    expect(list.tail!.value).toBe(1);
    expect(list.length).toBe(1);
  });

  test("remove empty", () => {
    const list = new DoublyLinkedList<number>();
    list.remove(0);
    expect(list.head).toBeNull();
    expect(list.tail).toBeNull();
    expect(list.length).toBe(0);
  });

  test("remove single", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.remove(0);
    expect(list.head).toBeNull();
    expect(list.tail).toBeNull();
    expect(list.length).toBe(0);
  });

  test("remove head", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.append(2);
    list.remove(0);
    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(2);
    expect(list.tail!.value).toBe(2);
    expect(list.length).toBe(1);
  });

  test("remove tail", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.append(2);
    list.remove(1);
    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(1);
    expect(list.tail!.value).toBe(1);
    expect(list.length).toBe(1);
  });

  test("remove middle", () => {
    const list = new DoublyLinkedList<number>();
    list.append(1);
    list.append(2);
    list.append(3);
    list.remove(1);
    expect(list.head).not.toBeNull();
    expect(list.tail).not.toBeNull();
    expect(list.head!.value).toBe(1);
    expect(list.tail!.value).toBe(3);
    expect(list.head!.next!.value).toBe(3);
    expect(list.tail!.prev!.value).toBe(1);
    expect(list.length).toBe(2);
  });
});
