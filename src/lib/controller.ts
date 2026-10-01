export enum MouseButton {
  Left = 0,
  Middle,
  Right,
}

export type GameMouseClearEvent = { type: "clear" };

export type GameMousePressEvent = {
  type: "press";
  button: MouseButton;
  x: number;
  y: number;
};

export type GameMouseReleaseEvent = {
  type: "release";
  button: MouseButton;
  x: number;
  y: number;
};

export type GameMouseMoveEvent = {
  type: "move";
  deltaX: number;
  deltaY: number;
  x: number;
  y: number;
};

export type GameMouseScrollEvent = { type: "scroll"; delta: number };

export type GameMouseEvent =
  | GameMouseClearEvent // e.g. mouse exits the window;
  | GameMousePressEvent
  | GameMouseReleaseEvent
  | GameMouseMoveEvent
  | GameMouseScrollEvent;

export default class Controller {
  private mouseEvents: GameMouseEvent[] = [];

  constructor(canvas: HTMLCanvasElement) {
    canvas.addEventListener("pointerout", (event) => {
      event.preventDefault();

      this.mouseEvents.push({
        type: "clear",
      });
    });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      this.mouseEvents.push({
        type: "press",
        button: event.button,
        x: event.x,
        y: event.y,
      });
    });

    canvas.addEventListener("pointerup", (event) => {
      event.preventDefault();

      this.mouseEvents.push({
        type: "release",
        button: event.button,
        x: event.x,
        y: event.y,
      });
    });

    canvas.addEventListener("pointermove", (event) => {
      event.preventDefault();

      this.mouseEvents.push({
        type: "move",
        deltaX: event.movementX,
        deltaY: -event.movementY,
        x: event.x,
        y: event.y,
      });
    });

    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();

      this.mouseEvents.push({ type: "scroll", delta: event.deltaY });
    });

    canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();

      this.mouseEvents.push({
        type: "press",
        button: MouseButton.Right,
        x: event.x,
        y: event.y,
      });
    });
  }

  getMouseEvents(): GameMouseEvent[] {
    const events = structuredClone(this.mouseEvents);
    this.mouseEvents = [];
    return events;
  }
}
