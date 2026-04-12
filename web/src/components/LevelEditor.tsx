import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor, {
  Brush,
  type LevelEditorMode,
} from "../lib/level-editor";

const MAX_SCALE = 2.0;
const MIN_SCALE = 0.1;

export default function LevelEditorComponent() {
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

    LevelEditor.create(containerRef.current).then(setLevelEditor);
  }, []);

  useEffect(() => {
    if (!levelEditor) {
      return;
    }
    levelEditor?.setMode(mode);
  }, [mode]);

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
                      brush: Brush.Normal,
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
                      brush: Brush.Difficult,
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
                      brush: Brush.Eraser,
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
                      texture: "grass.png",
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
                      texture: "cobble.jpg",
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
                      texture: "mud.jpg",
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
                      texture: "water.jpg",
                    },
                  });
                }}
              >
                Water
              </button>
            </li>
          </>
        )}
      </ul>
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
      />
    </>
  );
}
