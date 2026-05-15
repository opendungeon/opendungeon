import {
  createContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type WheelEventHandler,
} from "react";
import type { LevelEditorMode } from "../lib/level-editor";
import LevelEditor, { MouseButton } from "../lib/level-editor";
import waterTexture from "../assets/water.jpg";
import grassTexture from "../assets/grass.png";
import stoneTexture from "../assets/cobble.jpg";
import mudTexture from "../assets/mud.jpg";
import { Assets, Texture } from "pixi.js";

type ContextType = {
  editor: LevelEditor | null;
  mode: LevelEditorMode;
  scale: number;
};

const LevelEditorContext = createContext<ContextType | null>(null);

const DEFAULT_MODE: LevelEditorMode = {
  input: { strokeWidth: 1 },
  view: "texture",
  isDragging: false,
  button: MouseButton.Left,
  cursor: "default",
};

const MAX_SCALE = 2.0;
const MIN_SCALE = 0.1;

export function LevelEditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<LevelEditor | null>(null);

  const state = useSyncExternalStore(
    editor?.subscribe.bind(editor) ?? (() => () => {}),
    () => editor?.getState(),
  );

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    Assets.load([waterTexture, grassTexture, stoneTexture, mudTexture])
      .then((lookup) => {
        const textures = !lookup ? [] : Object.values<Texture>(lookup);
        return LevelEditor.create(containerRef.current!, textures);
      })
      .then(setEditor);
  });

  const value: ContextType | null = useMemo(() => {
    if (!state) {
      return null;
    } else {
      return {
        editor,
        mode: state.mode,
        scale: state.canvas.container.scale.x,
      };
    }
  }, [editor, state]);

  const handleWheel: WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!editor || !state) {
      return;
    }

    const newScale =
      event.deltaY > 0
        ? Math.max(MIN_SCALE, state.canvas.container.scale.x - 0.05)
        : Math.min(MAX_SCALE, state.canvas.container.scale.x + 0.05);
    editor.setScale(newScale);
  };

  return (
    <LevelEditorContext.Provider value={value}>
      <>
        {children}
        <div ref={containerRef} onWheel={handleWheel} />
      </>
    </LevelEditorContext.Provider>
  );
}
