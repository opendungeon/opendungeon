import grassTexture from "../assets/grass.png";
import mudTexture from "../assets/mud.jpg";
import { HexGrid } from "../lib/grid";
import { Application } from "@pixi/react";
import { useCallback, useEffect, useState } from "react";
import {
  Assets,
  FederatedMouseEvent,
  FederatedWheelEvent,
  Graphics,
  ImageSource,
  Point,
  Rectangle,
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

  const handleWheel: FederatedEventHandler<FederatedWheelEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (ev.deltaY > 0) {
      setZoom((prev) => Math.max(MIN_ZOOM, prev - 0.05));
    } else {
      setZoom((prev) => Math.min(MAX_ZOOM, prev + 0.05));
    }
  };

  const handleMouseDown: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    // if (input.type !== "idle") {
    //   return;
    // }

    if (ev.button === LEFT_MOUSE_BUTTON) {
      if (input.type === "painting") {
        input.isActive = true;
        return;
      }
      setInput({ type: "cameradragging" });
      return;
    }
  };

  const handleMouseUp: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
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

  const handleMouseMove: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (input.type === "cameradragging") {
      setPosition(
        (prev) => new Point(prev.x + ev.movementX, prev.y + ev.movementY),
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
        current.setCell(cell.point.q, cell.point.r, input.brush)
        console.log("painted a cell")
        return current
      })
    }
  };

  const handleRightClick: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
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

  const draw = useCallback(
    (ctx: Graphics) => {
      ctx.clear();

      grid.forEachCell((cell) => {
        if (cell.weight === 0) {
          drawHexagon(ctx, cell.point, {
            stroke: {
              width: 3,
              color: "lightgray",
            },
          });
          return;
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
      });
    },
    [grid, input, selectedPoint, textures],
  );

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
        <Application resolution={1} autoDensity resizeTo={window}>
          <pixiContainer
            x={0}
            y={0}
            interactive
            eventMode="dynamic"
            hitArea={hitArea}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onRightClick={handleRightClick}
          >
            <pixiGraphics position={position} scale={scale} draw={draw} />
          </pixiContainer>
        </Application>
      </div>
    </>
  );
}
