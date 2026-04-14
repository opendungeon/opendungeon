import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor, {
  MouseButton,
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
  FaRuler,
  FaSquare,
  FaX,
} from "react-icons/fa6";
import { CiText } from "react-icons/ci";
import { FaPaintBrush } from "react-icons/fa";
import { MdForest } from "react-icons/md";

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
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button === MouseButton.Right) {
        setMode((prev) => {
          const updated = {
            ...prev,
            input: {
              ...prev.input,
              button: MouseButton.Right,
              isDragging: true,
            },
          };
          return updated;
        });
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === MouseButton.Right) {
        setMode((prev) => {
          const updated = {
            ...prev,
            input: {
              ...prev.input,
              button: MouseButton.Left,
              isDragging: false,
            },
          };
          return updated;
        });
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mode]);

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
      <span className="absolute left-4 bottom-4 text-white z-20">
        {scale.toFixed(2)}
      </span>
      <div
        data-passthrough={mode.input?.isDragging === true}
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
                  input: {
                    button: MouseButton.Left,
                    isDragging: false,
                  },
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
                  input: {
                    button: MouseButton.Left,
                    isDragging: false,
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
                  input: {
                    button: MouseButton.Left,
                    isDragging: false,
                  },
                });
              }
            }}
          />
          {!menuOpen && (
            <button
              className="absolute -right-12 top-0 bottom-0 rounded-md h-min self-center px-2 py-3
          bg-[#222222] border-2 border-[#444444] hover:border-[#777777] active:bg-[#111111]"
              onClick={() => setMenuOpen(true)}
            >
              <FaChevronRight size={18} color="white" />
            </button>
          )}
        </ul>
        <div
          data-active={menuOpen}
          className={`py-2 px-4 w-64 flex-col gap-4 bg-[#222222]/85 border-[#777777] data-[active=true]:border-2
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
                        input: {
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                  }}
                  data-active={mode.view === "texture"}
                  className="px-4 bg-[#444444] active:bg-[#222222] border-2 border-[#777777] data-[active=false]:hover:border-[#aaaaaa] 
              rounded-md data-[active=true]:bg-[#222222]"
                >
                  Texture
                </button>
                <button
                  onClick={() => {
                    if (mode.view !== "terrain")
                      setMode({
                        view: "terrain",
                        input: {
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                  }}
                  data-active={mode.view === "terrain"}
                  className="px-4 bg-[#444444] active:bg-[#222222] border-2 border-[#777777] data-[active=false]:hover:border-[#aaaaaa] 
              rounded-md data-[active=true]:bg-[#222222]"
                >
                  Terrain
                </button>
              </div>
              {mode.view === "texture" ? (
                <ul className="grid grid-cols-3 gap-4 pt2">
                  {[waterTexture, grassTexture, stoneTexture, mudTexture].map(
                    (texture, i) => (
                      <li
                        key={i}
                        data-active={
                          mode.view === "texture" && mode.input?.textureId === i
                        }
                        onClick={() => {
                          setMode({
                            ...mode,
                            input: {
                              textureId:
                                mode.input?.textureId === i ? undefined : i,
                              button: MouseButton.Left,
                              isDragging: false,
                            },
                          });
                        }}
                        className="border-0 data-[active=false]:hover:border-2 data-[active=true]:border-2 data-[active=false]:hover:border-[#222222] data-[active=true]:border-white rounded-sm"
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
                      mode.view === "texture" && mode.input?.textureId === -1
                    }
                    onClick={() => {
                      setMode({
                        ...mode,
                        input: {
                          textureId:
                            mode.input?.textureId === -1 ? undefined : -1,
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                    }}
                    className="w-16 h-16 bg-[#111111] border-2 border-[#444444] flex justify-center data-[active=false]:hover:border-white data-[active=true]:border-white rounded-sm"
                  >
                    <FaEraser size={36} color="white" className="self-center" />
                  </li>
                </ul>
              ) : (
                <ul className="flex flex-col gap-4 w-min pt-4">
                  <li
                    data-active={mode.input?.terrain === Terrain.Normal}
                    onClick={() => {
                      setMode({
                        ...mode,
                        input: {
                          terrain:
                            mode.input?.terrain === Terrain.Normal
                              ? undefined
                              : Terrain.Normal,
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                    }}
                    className="flex flex-row justify-between gap-4 w-full px-4 bg-[#444444] active:bg-[#222222] border-2 border-[#777777] data-[active=false]:hover:border-[#aaaaaa] 
              rounded-md data-[active=true]:bg-[#222222]"
                  >
                    <span>Normal</span>
                    <FaSquare
                      size={16}
                      color="green"
                      className="self-center border-[#aaaaaa] border-2 rounded-sm"
                    />
                  </li>
                  <li
                    data-active={mode.input?.terrain === Terrain.Difficult}
                    onClick={() => {
                      setMode({
                        ...mode,
                        input: {
                          terrain:
                            mode.input?.terrain === Terrain.Difficult
                              ? undefined
                              : Terrain.Difficult,
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                    }}
                    className="flex flex-row justify-between gap-4 w-full px-4 bg-[#444444] active:bg-[#222222] border-2 border-[#777777] data-[active=false]:hover:border-[#aaaaaa] 
              rounded-md data-[active=true]:bg-[#222222]"
                  >
                    <span>Difficult</span>
                    <FaSquare
                      size={16}
                      color="yellow"
                      className="self-center border-[#aaaaaa] border-2 rounded-sm"
                    />
                  </li>
                  <li
                    data-active={mode.input?.terrain === Terrain.Empty}
                    onClick={() => {
                      setMode({
                        ...mode,
                        input: {
                          terrain:
                            mode.input?.terrain === Terrain.Empty
                              ? undefined
                              : Terrain.Empty,
                          button: MouseButton.Left,
                          isDragging: false,
                        },
                      });
                    }}
                    className="flex flex-row justify-between gap-4 w-full px-4 bg-[#444444] active:bg-[#222222] border-2 border-[#777777] data-[active=false]:hover:border-[#aaaaaa] 
              rounded-md data-[active=true]:bg-[#222222]"
                  >
                    <span>Empty</span>
                    <FaSquare
                      size={16}
                      color="#111111"
                      className="self-center border-[#aaaaaa] border-2 rounded-sm"
                    />
                  </li>
                </ul>
              )}
            </>
          ) : null}

          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-2 right-2 p-1
          bg-[#444444] border-2 border-[#666666] rounded-md hover:border-[#888888] active:bg-[#222222]"
          >
            <FaX size={16} color="white" />
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
      />
    </>
  );
}
