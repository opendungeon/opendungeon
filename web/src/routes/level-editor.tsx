import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor, {
  Terrain,
  type LevelEditorMode,
} from "../lib/level-editor";
import { Assets, Texture } from "pixi.js";
import waterTexture from "../assets/water.jpg";
import grassTexture from "../assets/grass.png";
import stoneTexture from "../assets/cobble.jpg";
import mudTexture from "../assets/mud.jpg";

const MAX_SCALE = 2.0;
const MIN_SCALE = 0.1;

export const Route = createFileRoute("/level-editor")({
  component: LevelEditorComponent,
});

function LevelEditorComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levelEditor, setLevelEditor] = useState<LevelEditor>();
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState<LevelEditorMode>({
    view: "texture",
    input: {
      type: "panning",
      isDragging: false,
    },
  });

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    Assets.load([waterTexture, grassTexture, stoneTexture, mudTexture])
      .then((lookup) => {
        const textures = !lookup ? [] : Object.values<Texture>(lookup);
        return LevelEditor.create(containerRef.current!, textures);
      })
      .then(setLevelEditor);
  }, []);

  useEffect(() => {
    if (!levelEditor) {
      return;
    }
    levelEditor.setMode(mode);
  }, [levelEditor, mode]);

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!levelEditor) {
      return;
    }

    setScale((prev) => {
      const newScale =
        event.deltaY > 0
          ? Math.max(MIN_SCALE, prev - 0.05)
          : Math.min(MAX_SCALE, prev + 0.05);
      levelEditor.setScale(newScale);
      return newScale;
    });
  };

  return (
    <>
      <ul className="text-white relative z-10 w-min">
        <h2 className="text-white">Mode: {mode.view}</h2>
        <button
          className="text-white bg-blue-500"
          onClick={() => {
            if (mode.view === "terrain") {
              setMode({
                view: "texture",
                input: { type: "panning", isDragging: false },
              });
            } else {
              setMode({
                view: "terrain",
                input: { type: "panning", isDragging: false },
              });
            }
          }}
        >
          switch mode
        </button>
        {mode.view === "terrain" ? (
          <>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: { type: "panning", isDragging: false },
                  });
                }}
              >
                Pan
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      terrain: Terrain.Normal,
                    },
                  });
                }}
              >
                Paint
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      terrain: Terrain.Difficult,
                    },
                  });
                }}
              >
                Paint Difficult
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      terrain: Terrain.Empty,
                    },
                  });
                }}
              >
                Erase
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: { type: "panning", isDragging: false },
                  });
                }}
              >
                Pan
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      textureId: 1,
                    },
                  });
                }}
              >
                Grass
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      textureId: 2,
                    },
                  });
                }}
              >
                Cobble
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      textureId: 3,
                    },
                  });
                }}
              >
                Mud
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      textureId: 0,
                    },
                  });
                }}
              >
                Water
              </button>
            </li>
            <li>
              <button
                className="text-white bg-blue-500"
                onClick={() => {
                  setMode({
                    ...mode,
                    input: {
                      type: "painting",
                      isDragging: false,
                      textureId: -1,
                    },
                  });
                }}
              >
                Eraser
              </button>
            </li>
          </>
        )}
        <li className="text-white">Scale: {scale.toFixed(2)}</li>
      </ul>
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
      />
    </>
  );
}
