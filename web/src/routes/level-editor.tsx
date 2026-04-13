import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor, { type LevelEditorMode } from "../lib/level-editor";
import { Assets, Texture } from "pixi.js";
import waterTexture from "../assets/water.jpg";
import grassTexture from "../assets/grass.png";
import stoneTexture from "../assets/cobble.jpg";
import mudTexture from "../assets/mud.jpg";
import { MenuButton } from "../components/MenuButton";
import { FaHandPointer, FaRuler } from "react-icons/fa6";
import { CiText } from "react-icons/ci";
import { FaPaintBrush } from "react-icons/fa";
import { MdForest } from "react-icons/md";

const MAX_SCALE = 2.0;
const MIN_SCALE = 0.1;

const MENU_BUTTONS: MenuButton[] = [
  {
    label: "Pan",
    Icon: FaHandPointer,
    onClick: () => {},
  },
  {
    label: "Measure",
    Icon: FaRuler,
    onClick: () => {},
  },
  {
    label: "Text",
    Icon: CiText,
    onClick: () => {},
  },
  {
    label: "Paint",
    Icon: FaPaintBrush,
    onClick: () => {},
  },
  {
    label: "Place",
    Icon: MdForest,
    onClick: () => {},
  },
];

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
  const [menuOpen, setMenuOpen] = useState(false);

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
      <div className="text-white flex flex-row gap-4 ml-6 mt-6 w-min relative z-10">
        <ul className="select-none flex flex-col gap-2">
          <MenuButton
            label="Pan"
            Icon={FaHandPointer}
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
          />
          <MenuButton
            label="Measure"
            Icon={FaRuler}
            onClick={() => {
              setMode({
                view: "measure",
                input: {
                  type: "panning",
                  isDragging: false,
                },
              });
              setMenuOpen(!menuOpen);
            }}
          />
          <MenuButton
            label="Text"
            Icon={CiText}
            onClick={() => {
              console.log("Not Implemented");
            }}
          />
          <MenuButton
            label="Paint"
            Icon={FaPaintBrush}
            onClick={() => {
              setMode({
                view: "texture",
                input: {
                  type: "panning",
                  isDragging: false,
                },
              });
              setMenuOpen(!menuOpen);
            }}
          />
          <MenuButton
            label="Place"
            Icon={MdForest}
            onClick={() => {
              setMode({
                view: "object",
                input: {
                  type: "panning",
                  isDragging: false,
                },
              });
              setMenuOpen(!menuOpen);
            }}
          />
        </ul>
        <div
          data-active={menuOpen}
          className="bg-[#222222] opacity-90 border-[#777777] w-0 h-64 data-[active=true]:w-64 data-[active=true]:border-2 duration-100"
        ></div>
      </div>

      {/*{<ul className="text-white relative z-10 w-min">
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
      </ul>} */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
      />
    </>
  );
}
