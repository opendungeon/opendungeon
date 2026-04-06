import { Application } from "@pixi/react";
import HexagonalGrid from "./HexagonalGrid";
import { useEffect, useState } from "react";
import {
  FederatedMouseEvent,
  FederatedWheelEvent,
  Point,
  Rectangle,
  type FederatedEventHandler,
} from "pixi.js";
import { Axial } from "../lib/point";

const BOARD_WIDTH = 5;
const BOARD_HEIGHT = 5;
const HEXAGON_RADIUS = 200;

export default function GameWindow() {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(new Point(0, 0));
  const [zoom, setZoom] = useState(0.6);
  const [hitArea, setHitArea] = useState(
    () => new Rectangle(0, 0, window.innerWidth, window.innerHeight),
  );
  const [selectedCell, setSelectedCell] = useState<{ q: number; r: number }>();

  useEffect(() => {
    const onResize = () => {
      setHitArea(new Rectangle(0, 0, window.innerWidth, window.innerHeight));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

    if (isDragging) {
      return;
    }

    if (ev.button !== 0) {
      return;
    }

    setIsDragging(true);
  };

  const handleMouseUp: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    setIsDragging(false);
  };

  const handleMouseMove: FederatedEventHandler<FederatedMouseEvent> = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    if (!isDragging) {
      return;
    }

    setPosition(
      (prev) => new Point(prev.x + ev.movementX, prev.y + ev.movementY),
    );
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

    setSelectedCell(rounded);
  };

  return (
    <div
      onContextMenu={(ev) => ev.preventDefault()}
      className="absolute inset-0 -z-10"
    >
      <Application resizeTo={window}>
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
          <HexagonalGrid
            width={BOARD_WIDTH}
            height={BOARD_HEIGHT}
            radius={HEXAGON_RADIUS}
            position={position}
            scale={zoom}
            selectedCell={selectedCell}
          />
        </pixiContainer>
      </Application>
    </div>
  );
}
