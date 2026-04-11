import grassTexture from "../assets/grass.png";
import mudTexture from "../assets/mud.jpg";
import { HexGrid } from "../lib/grid";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Application,
  Assets,
  Container,
  FederatedMouseEvent,
  FederatedPointerEvent,
  FederatedWheelEvent,
  Graphics,
  ImageSource,
  Point,
  Rectangle,
  type ContainerChild,
  type FederatedEventHandler,
} from "pixi.js";
import { Axial } from "../lib/point";
import { drawHexagon, drawLine, HEXAGON_RADIUS } from "../lib/shapes";

const LEFT_MOUSE_BUTTON = 0;
const MAX_ZOOM = 2;
const MIN_ZOOM = 0.15;

type LevelEditorProps = {};

type InputState =
  | { type: "idle" }
  | { type: "cameradragging" }
  | { type: "painting"; brush: number; isActive: boolean };

function createEmptyGrid() {
  const grid = new HexGrid(32, 32);

  grid.forEachCell((cell) => {
    grid.setCell(cell.point.q, cell.point.r, 0);
  });

  return grid;
}

export default function LevelEditor({}: LevelEditorProps) {
  const [input, setInput] = useState<InputState>({ type: "idle" });
  const [position, setPosition] = useState(new Point(0, 0));
  const [scale, setZoom] = useState(0.6);
  const [hitArea, setHitArea] = useState(
    () => new Rectangle(0, 0, window.innerWidth, window.innerHeight),
  );
  const [selectedPoint, setSelectedPoint] = useState<Axial>();
  const [textures, setTextures] = useState<Record<string, ImageSource>>({});
  const [grid, setGrid] = useState<HexGrid>(createEmptyGrid());

  useEffect(() => {
    const onResize = () => {
      setHitArea(new Rectangle(0, 0, window.innerWidth, window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    Assets.load([grassTexture, mudTexture]).then(setTextures);
  }, []);

  const handleRightClick = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    const [gridElement] = ev.target.children;
    const localPosition = ev.getLocalPosition(gridElement);
    const rounded = Axial.fromPixel(
      localPosition,
      HEXAGON_RADIUS,
      0.5 * HEXAGON_RADIUS,
    );

    if (!grid.getCell(rounded.q, rounded.r)?.weight) {
      return;
    }

    setSelectedPoint(rounded);
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<Container<ContainerChild>>();

  const handleWheel = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!container) {
      return;
    }

    if (ev.deltaY > 0) {
      container.scale.set(
        Math.max(container.scale.x - 0.05, MIN_ZOOM),
        Math.max(container.scale.y - 0.05, MIN_ZOOM),
      );
    } else {
      container.scale.set(
        Math.min(container.scale.x + 0.05, MAX_ZOOM),
        Math.min(container.scale.y + 0.05, MAX_ZOOM),
      );
    }
  };

  const handleMouseDown = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!container) {
      return;
    }

    const x = ev.clientX;
    const y = ev.clientY;

    const point = container?.toLocal({ x, y });

    const child = container.children.find<Graphics>((child) => {
      if (child instanceof Graphics) {
        const childPoint = child.toLocal(point);
        console.log(point, childPoint)
        return child.containsPoint(point);
      }
      return false
    });

    if (child) {
        child.fill("green")
    }

    if (ev.button === LEFT_MOUSE_BUTTON) {
      if (input.type === "painting") {
        input.isActive = true;
        return;
      }
      setInput({ type: "cameradragging" });
      return;
    }
  };

  const handleMouseMove = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!container) {
      return;
    }

    if (input.type === "cameradragging") {
      container.position = new Point(
        container.position.x + ev.movementX,
        container.position.y + ev.movementY,
      );
      return;
    } else if (input.type === "painting" && input.isActive === true) {
      const [gridElement] = ev.target.children;
      const localPosition = ev.getLocalPosition(gridElement);
      const rounded = Axial.fromPixel(
        localPosition,
        HEXAGON_RADIUS,
        0.5 * HEXAGON_RADIUS,
      );

      const cell = grid.getCell(rounded.q, rounded.r);

      if (!cell || cell.weight === input.brush) {
        return;
      }

      setGrid((current) => {
        current.setCell(cell.point.q, cell.point.r, input.brush);
        return current;
      });
    }
  };

  const handleMouseUp = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (ev.button === LEFT_MOUSE_BUTTON) {
      if (input.type === "cameradragging") {
        setInput({ type: "idle" });
      } else if (input.type === "painting" && input.isActive) {
        input.isActive = false;
      }
    }
  };

  useLayoutEffect(() => {
    (async () => {
      const app = new Application();

      await app.init({
        background: "black",
        resizeTo: window,
      });

      canvasRef.current!.appendChild(app.canvas);

      const container = new Container({
        eventMode: "static",
      });

      app.stage.addChild(container);
      container?.on("mousedown", handleMouseDown);
      container?.on("wheel", handleWheel, { passive: true });

      setContainer(container);
    })();
  }, []);

  useEffect(() => {
    if (!container) {
      return;
    }

    grid.forEachCell((cell) => {
      const ctx = new Graphics();
      if (cell.weight === 0) {
        drawHexagon(ctx, cell.point, {
          stroke: {
            width: 3,
            color: "lightgray",
          },
        });
      } else if (cell.weight === 1) {
        drawHexagon(ctx, cell.point, {
          fill: "green",
          stroke: {
            width: 3,
            color: "lightgray",
          },
        });
      } else {
        drawHexagon(ctx, cell.point, {
          fill: "yellow",
          stroke: {
            width: 3,
            color: "lightgray",
          },
        });
      }

      container.addChild(ctx);
    });
  }, [container]);

  if (!textures) return null;
  return (
    <>
      <button
        onClick={() =>
          setInput({
            type: "cameradragging",
          })
        }
        className="text-white px-4"
      >
        move
      </button>
      <button
        onClick={() =>
          setInput({
            type: "painting",
            brush: 1,
            isActive: false,
          })
        }
        className="text-white"
      >
        paint
      </button>
      <div
        onContextMenu={(ev) => ev.preventDefault()}
        className="absolute inset-0 -z-10"
      >
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        ></div>
      </div>
    </>
  );
}
