export default interface Game {
  /** create elements, load textures, setup event handlers */
  start(canvas: HTMLCanvasElement): Promise<void>;
  /** update the game state - runs each tick */
  update(dt: number): void;
  /** draw the game window */
  draw(): void;
  /** clean up game */
  destroy(): void;
}
