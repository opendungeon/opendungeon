import {
  Application,
  Container,
  Rectangle,
  type ContainerChild,
  type Renderer,
} from "pixi.js";

export default class Canvas {
  readonly app: Application<Renderer>;
  readonly container: Container<ContainerChild>;
  readonly interactor: Container<ContainerChild>;

  private constructor(app: Application<Renderer>) {
    this.app = app;

    this.container = new Container();
    this.app.stage.addChild(this.container);

    this.interactor = new Container();
    this.interactor.eventMode = "static";
    this.interactor.hitArea = new Rectangle(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );

    window.addEventListener("resize", () => {
      this.interactor.hitArea = new Rectangle(
        0,
        0,
        window.innerWidth,
        window.innerHeight,
      );
    });

    this.app.stage.addChild(this.interactor);
  }

  static async create(element: HTMLElement): Promise<Canvas> {
    const app = new Application();
    await app.init({
      background: "black",
      resizeTo: window,
      antialias: true,
    });
    element.appendChild(app.canvas);

    return new Canvas(app);
  }
}
