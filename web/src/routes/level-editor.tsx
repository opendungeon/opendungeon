import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type PointerEventHandler,
  type WheelEventHandler,
} from "react";
import LevelEditor, {
  MouseButton,
  RulerType,
  Terrain,
  type LevelEditorMode,
} from "../lib/level-editor";
import { Assets, Texture } from "pixi.js";
import waterTexture from "../assets/water.jpg";
import grassTexture from "../assets/grass.png";
import stoneTexture from "../assets/cobble.jpg";
import mudTexture from "../assets/mud.jpg";
import { MenuButton } from "../components/MenuButton";
import {
  FaChevronRight,
  FaEraser,
  FaHandPointer,
  FaRegCircle,
  FaRegSquare,
  FaRuler,
  FaSquare,
  FaX,
} from "react-icons/fa6";
import { CiText } from "react-icons/ci";
import { FaPaintBrush } from "react-icons/fa";
import { MdForest } from "react-icons/md";
import { TbCone, TbRulerMeasure } from "react-icons/tb";

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
    isDragging: false,
    button: MouseButton.Left,
    input: { strokeWidth: 1 },
  });
  const [menuOpen, setMenuOpen] = useState(true);

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

  const handleContextMenu: MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Control") {
      setMode((prev) => {
        if (prev.view !== "measure" || !prev.isDragging) {
          return prev;
        }

        const updated = {
          ...prev,
          input: {
            ...prev.input,
            mirroredPath: true,
          },
        };
        return updated;
      });

      levelEditor?.toggleAltPath(true);
    }
  };

  const handleKeyUp: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === "Control") {
      setMode((prev) => {
        if (prev.view !== "measure" || !mode.isDragging) {
          return prev;
        }

        const updated = {
          ...prev,
          input: {
            ...prev.input,
            mirroredPath: false,
          },
        };
        return updated;
      });

      levelEditor?.toggleAltPath(false);
    }
  };

  const handlePointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button === MouseButton.Right) {
      setMode((prev) => {
        const updated = {
          ...prev,
          isDragging: true,
          button: MouseButton.Right,
        };
        return updated;
      });
    } else if (event.button === MouseButton.Left) {
      setMode((prev) => {
        const updated = {
          ...prev,
          button: MouseButton.Left,
        };
        return updated;
      });
    }
  };

  const handlePointerUp: PointerEventHandler = (event) => {
    if (event.button === MouseButton.Right) {
      setMode((prev) => {
        const updated = {
          ...prev,
          isDragging: false,
          button: MouseButton.Left,
        };
        return updated;
      });
    } else if (event.button === MouseButton.Left) {
      setMode((prev) => {
        const updated = {
          ...prev,
          isDragging: false,
          button: MouseButton.Left,
        };
        return updated;
      });
    }
  };

  const handlePointerEnter: PointerEventHandler<HTMLDivElement> = () => {
    containerRef.current?.focus();
  };

  return (
    <>
      <span className="absolute left-4 bottom-4 text-white z-20">
        {scale.toFixed(2)}
      </span>
      <div
        data-passthrough={mode.isDragging === true}
        className="text-white flex flex-row gap-4 ml-6 mt-6 w-min relative z-10 pointer-events-auto data-[passthrough=true]:pointer-events-none"
      >
        <ul className="select-none flex flex-col gap-2 z-20 relative h-min">
          <MenuButton
            label="Select"
            Icon={FaHandPointer}
            active={false}
            onClick={() => {
              console.log("Not implemented");
            }}
          />
          <MenuButton
            label="Measure"
            Icon={FaRuler}
            active={mode.view === "measure"}
            onClick={() => {
              if (mode.view === "measure") {
                setMenuOpen(!menuOpen);
              } else {
                if (!menuOpen) {
                  setMenuOpen(true);
                }
                setMode({
                  view: "measure",
                  isDragging: false,
                  button: MouseButton.Left,
                  input: { rulerType: RulerType.Line },
                });
              }
            }}
          />
          <MenuButton
            label="Text"
            Icon={CiText}
            active={false}
            onClick={() => {
              console.log("Not Implemented");
            }}
          />
          <MenuButton
            label="Paint"
            Icon={FaPaintBrush}
            active={mode.view === "terrain" || mode.view === "texture"}
            onClick={() => {
              if (mode.view === "texture" || mode.view === "terrain") {
                setMenuOpen(!menuOpen);
              } else {
                if (!menuOpen) {
                  setMenuOpen(true);
                }
                setMode({
                  view: "texture",
                  isDragging: false,
                  button: MouseButton.Left,
                  input: {
                    strokeWidth: 1,
                  },
                });
              }
            }}
          />
          <MenuButton
            label="Decorate"
            Icon={MdForest}
            active={mode.view === "decorate"}
            onClick={() => {
              if (mode.view === "decorate") {
                setMenuOpen(!menuOpen);
              } else {
                if (!menuOpen) {
                  setMenuOpen(true);
                }
                setMode({
                  view: "decorate",
                  isDragging: false,
                  button: MouseButton.Left,
                  input: {},
                });
              }
            }}
          />
          {!menuOpen && (
            <button
              className="absolute -right-12 top-0 bottom-0 rounded-md h-min self-center px-2 py-3
          bg-aurora-gray-200 border-2 border-aurora-gray-400 hover:border-aurora-gray-700 active:bg-aurora-gray-100"
              onClick={() => setMenuOpen(true)}
            >
              <FaChevronRight size={18} color="white" />
            </button>
          )}
        </ul>
        <div
          data-active={menuOpen}
          className={`py-2 px-4 w-64 flex-col gap-4 bg-aurora-gray-200/85 border-aurora-gray-700 data-[active=true]:border-2
          hidden data-[active=true]:flex rounded-md select-none`}
        >
          <h3 className="w-full text-center">
            {mode.view === "measure"
              ? "Measure Tool"
              : mode.view === "decorate"
                ? "Decorate Tool"
                : "Paint Tool"}
          </h3>
          {mode.view === "texture" || mode.view === "terrain" ? (
            <>
              <div className="flex flex-row w-full gap-8 justify-center">
                <button
                  onClick={() => {
                    if (mode.view !== "texture")
                      setMode({
                        view: "texture",
                        isDragging: false,
                        button: MouseButton.Left,
                        input: {
                          ...mode.input,
                        },
                      });
                  }}
                  data-active={mode.view === "texture"}
                  className="px-4 bg-aurora-gray-400 active:bg-aurora-gray-200 border-2 border-aurora-gray-700 data-[active=false]:hover:border-aurora-gray-1000 
              rounded-md data-[active=true]:bg-aurora-gray-200"
                >
                  Texture
                </button>
                <button
                  onClick={() => {
                    if (mode.view !== "terrain")
                      setMode({
                        view: "terrain",
                        isDragging: false,
                        button: MouseButton.Left,
                        input: {
                          ...mode.input,
                        },
                      });
                  }}
                  data-active={mode.view === "terrain"}
                  className="px-4 bg-aurora-gray-400 active:bg-aurora-gray-200 border-2 border-aurora-gray-700 data-[active=false]:hover:border-aurora-gray-1000 
              rounded-md data-[active=true]:bg-aurora-gray-200"
                >
                  Terrain
                </button>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={mode.input.strokeWidth}
                onChange={(e) => {
                  setMode({
                    ...mode,
                    input: {
                      ...mode.input,
                      strokeWidth: parseInt(e.target.value, 10),
                    },
                  });
                }}
              />
              {mode.input.strokeWidth}
              {mode.view === "texture" ? (
                <ul className="grid grid-cols-3 gap-4 pt2">
                  {[waterTexture, grassTexture, stoneTexture, mudTexture].map(
                    (texture, i) => (
                      <li
                        key={i}
                        data-active={
                          mode.view === "texture" && mode.input.textureId === i
                        }
                        onClick={() => {
                          setMode({
                            ...mode,
                            isDragging: false,
                            button: MouseButton.Left,
                            input: {
                              ...mode.input,
                              textureId:
                                mode.input.textureId === i ? undefined : i,
                            },
                          });
                        }}
                        className="border-0 data-[active=false]:hover:border-2 data-[active=true]:border-2 data-[active=false]:hover:border-aurora-gray-200 data-[active=true]:border-white rounded-sm"
                      >
                        <img
                          src={texture}
                          className="object-cover aspect-square w-16 rounded-sm"
                        />
                      </li>
                    ),
                  )}
                  <li
                    data-active={
                      mode.view === "texture" && mode.input.textureId === -1
                    }
                    onClick={() => {
                      setMode({
                        ...mode,
                        isDragging: false,
                        button: MouseButton.Left,
                        input: {
                          ...mode.input,
                          textureId:
                            mode.input.textureId === -1 ? undefined : -1,
                        },
                      });
                    }}
                    className="w-16 h-16 bg-aurora-gray-100 border-2 border-aurora-gray-400 flex justify-center data-[active=false]:hover:border-white data-[active=true]:border-white rounded-sm"
                  >
                    <FaEraser size={36} color="white" className="self-center" />
                  </li>
                </ul>
              ) : (
                <ul className="flex flex-col gap-4 w-min pt-4">
                  {[
                    {
                      terrain: Terrain.Normal,
                      label: "Normal",
                      color: "green",
                    },
                    {
                      terrain: Terrain.Difficult,
                      label: "Difficult",
                      color: "yellow",
                    },
                    {
                      terrain: Terrain.Empty,
                      label: "Empty",
                      color: "#111111",
                    },
                  ].map(({ terrain, label, color }, i) => (
                    <li
                      key={i}
                      data-active={mode.input.terrain === terrain}
                      onClick={() => {
                        setMode({
                          ...mode,
                          isDragging: false,
                          button: MouseButton.Left,
                          input: {
                            ...mode.input,
                            terrain:
                              mode.input.terrain === terrain
                                ? undefined
                                : terrain,
                          },
                        });
                      }}
                      className="flex flex-row justify-between gap-4 w-full px-4 bg-aurora-gray-400 active:bg-aurora-gray-200 border-2 border-aurora-gray-700 data-[active=false]:hover:border-aurora-gray-1000 
              rounded-md data-[active=true]:bg-aurora-gray-200"
                    >
                      <span>{label}</span>
                      <FaSquare
                        size={16}
                        color={color}
                        className="self-center border-aurora-gray-1000 border-2 rounded-sm"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : mode.view === "measure" ? (
            <ul className="flex flex-col gap-4 w-min pt-4">
              {[
                {
                  rulerType: RulerType.Line,
                  label: "Line",
                  Icon: TbRulerMeasure,
                },
                {
                  rulerType: RulerType.Cone,
                  label: "Cone",
                  Icon: TbCone,
                },
                {
                  rulerType: RulerType.Circle,
                  label: "Circle",
                  Icon: FaRegCircle,
                },
                {
                  rulerType: RulerType.Square,
                  label: "Square",
                  Icon: FaRegSquare,
                },
              ].map(({ rulerType, label, Icon }, i) => (
                <li
                  key={i}
                  data-active={mode.input.rulerType === rulerType}
                  onClick={() => {
                    setMode({
                      ...mode,
                      isDragging: false,
                      button: MouseButton.Left,
                      input: {
                        ...mode.input,
                        rulerType,
                      },
                    });
                  }}
                  className="flex flex-row justify-between gap-4 w-full px-4 py-2 bg-aurora-gray-400 active:bg-aurora-gray-200 border-2 border-aurora-gray-700 data-[active=false]:hover:border-aurora-gray-1000 
              rounded-md data-[active=true]:bg-aurora-gray-200"
                >
                  <span>{label}</span>
                  <Icon
                    size={24}
                    color="white"
                    className="self-center rounded-sm"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-2 right-2 p-1
          bg-aurora-gray-400 border-2 border-aurora-gray-600 rounded-md hover:border-aurora-gray-800 active:bg-aurora-gray-200"
          >
            <FaX size={16} color="white" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        tabIndex={0}
      />
    </>
  );
}
