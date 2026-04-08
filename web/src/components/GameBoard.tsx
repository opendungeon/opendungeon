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
  type ColorSource,
  type FederatedEventHandler,
  type FillInput,
} from "pixi.js";
import { Axial } from "../lib/point";

const HEXAGON_RADIUS = 200;
const LEFT_MOUSE_BUTTON = 0;

type HexagonStyle = {
  texture?: ImageSource;
  fill?: ColorSource;
  stroke?: {
    color: ColorSource;
    width: number;
  };
};

function drawHexagon(ctx: Graphics, position: Axial, style: HexagonStyle) {
  const { x, y } = position.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);

  if (style.stroke) {
    ctx.setStrokeStyle({
      width: style.stroke.width,
      color: style.stroke.color,
    });
  }

  if (style.fill) {
    ctx.setFillStyle({ color: style.fill });
  }

  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
    const vx = HEXAGON_RADIUS * Math.cos(angle) + x;
    const vy = 0.5 * HEXAGON_RADIUS * Math.sin(angle) + y;

    points.push(vx);
    points.push(vy);
  }

  ctx.poly(points);

  if (style.fill || style.texture) {
    ctx.fill(style.texture as FillInput);
  }
  if (style.stroke) {
    ctx.stroke();
  }
}

type LineStyle = {
  width: number;
  color: ColorSource;
};

function drawLine(ctx: Graphics, start: Axial, end: Axial, style: LineStyle) {
  const pixelStart = start.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);
  const pixelEnd = end.toPixel(HEXAGON_RADIUS, 0.5 * HEXAGON_RADIUS);
  ctx
    .moveTo(pixelStart.x, pixelStart.y)
    .lineTo(pixelEnd.x, pixelEnd.y)
    .stroke(style);
}

type GameBoardProps = {
  grid: HexGrid;
};

type InputState =
  | { type: "idle" }
  | { type: "cameradragging" }
  | { type: "measuredragging"; start: Axial; end?: Axial };

export default function GameBoard({ grid }: GameBoardProps) {
  const [input, setInput] = useState<InputState>({ type: "idle" });
  const [position, setPosition] = useState(new Point(0, 0));
  const [scale, setZoom] = useState(0.6);
  const [hitArea, setHitArea] = useState(
    () => new Rectangle(0, 0, window.innerWidth, window.innerHeight),
  );
  const [selectedCell, setSelectedCell] = useState<{ q: number; r: number }>();
  const [textures, setTextures] = useState<Record<string, ImageSource>>({});

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
      setZoom((prev) => Math.max(0.35, prev - 0.05));
    } else {
      setZoom((prev) => Math.min(2.0, prev + 0.05));
    }
  };

  const handleMouseDown: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (input.type !== "idle") {
      return;
    }

    if (ev.button === LEFT_MOUSE_BUTTON) {
      setInput({ type: "cameradragging" });
      return;
    }
  };

  const handleRightDown: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (input.type !== "idle") {
      return;
    }

    const [gridElement] = ev.target.children;
    const localPosition = ev.getLocalPosition(gridElement);
    const start = Axial.fromPixel(
      localPosition,
      HEXAGON_RADIUS,
      0.5 * HEXAGON_RADIUS,
    );

    setInput({ type: "measuredragging", start });
  };

  const handleMouseUp: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (input.type === "cameradragging" && ev.button === LEFT_MOUSE_BUTTON) {
      setInput({ type: "idle" });
    }
  };

  const handleRightUp: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (input.type === "measuredragging") {
      setInput({ type: "idle" });
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
    }

    if (input.type === "measuredragging") {
      const [gridElement] = ev.target.children;
      const localPosition = ev.getLocalPosition(gridElement);
      const end = Axial.fromPixel(
        localPosition,
        HEXAGON_RADIUS,
        0.5 * HEXAGON_RADIUS,
      );

      if (!end.isEqual(input.start)) {
        setInput((prev) => ({ ...prev, end }));
      }
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

    setSelectedCell(rounded);
  };

  const draw = useCallback(
    (ctx: Graphics) => {
      ctx.clear();

      grid.forEachCell((cell) => {
        if (cell.weight === 0) {
          return;
        }

        const style =
          cell.weight === 1
            ? {
                texture: textures[grassTexture],
                stroke: { width: 3, color: "lightgray" },
              }
            : {
                texture: textures[mudTexture],
                stroke: { width: 3, color: "lightgray" },
              };
        drawHexagon(ctx, new Axial(cell.q, cell.r), style);
      });

      if (selectedCell) {
        drawHexagon(ctx, new Axial(selectedCell.q, selectedCell.r), {
          fill: "#ff000044",
          stroke: { width: 10, color: "red" },
        });
      }

      if (input.type === "measuredragging" && input.end) {
        const style = { width: 10, color: "red" };
        drawLine(ctx, input.start, input.end, style);

        const pathResult = grid.getShortestPath(input.start, input.end);
        if (!pathResult.ok) {
          return;
        }
        for (const position of pathResult.path) {
          drawHexagon(ctx, position, { fill: "#FFFF0077" });
        }
      }
    },
    [grid, input, selectedCell, textures],
  );

  if (!textures) return null;

  return (
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
          onRightDown={handleRightDown}
          onRightUp={handleRightUp}
          onMouseMove={handleMouseMove}
          onRightClick={handleRightClick}
        >
          <pixiGraphics position={position} scale={scale} draw={draw} />
        </pixiContainer>
      </Application>
    </div>
  );
}
