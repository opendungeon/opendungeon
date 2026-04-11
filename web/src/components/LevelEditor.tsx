import {
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor, { type LevelEditorInputMode } from "../lib/level-editor";

const MAX_SCALE = 2.0;
const MIN_SCALE = 0.10;

export default function LevelEditorComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levelEditor, setLevelEditor] = useState<LevelEditor>();
  const [scale, setScale] = useState(1.0);
  const [mode, setMode] = useState<LevelEditorInputMode>({
    type: "panning",
    isDragging: false,
  });

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return;
    }

    LevelEditor.create(containerRef.current).then(setLevelEditor);
  }, []);

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
      <ul className="grid w-min relative z-10">
        <li>
          <button
            onClick={() => {
              levelEditor?.setMode({ type: "panning", isDragging: false });
              setMode({ type: "panning", isDragging: false });
            }}
            data-active={mode.type === "panning"}
            className="text-white p-4 bg-red-500 data-[active=true]:border-white data-[active=true]:border-1"
          >
            pan
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              console.log("painting");
              levelEditor?.setMode({
                type: "painting",
                isDragging: false,
                brush: 1,
              });
              setMode({
                type: "painting",
                isDragging: false,
                brush: 1,
              });
            }}
            data-active={mode.type === "painting" && mode.brush === 1}
            className="text-white p-4 bg-blue-500 data-[active=true]:border-white data-[active=true]:border-1"
          >
            paint
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              console.log("painting difficult");
              levelEditor?.setMode({
                type: "painting",
                isDragging: false,
                brush: 2,
              });
              setMode({
                type: "painting",
                isDragging: false,
                brush: 2,
              });
            }}
            data-active={mode.type === "painting" && mode.brush === 2}
            className="text-white p-4 bg-blue-500 data-[active=true]:border-white data-[active=true]:border-1"
          >
            paint difficult
          </button>
        </li>
        <li>
          <button
            onClick={() => {
              console.log("erasing");

              levelEditor?.setMode({
                type: "painting",
                isDragging: false,
                brush: 0,
              });
              setMode({
                type: "painting",
                isDragging: false,
                brush: 0,
              });
            }}
            data-active={mode.type === "painting" && mode.brush === 0}
            className="text-white p-4 bg-blue-500 data-[active=true]:border-white data-[active=true]:border-1"
          >
            erase
          </button>
        </li>
        <li className="text-white">Zoom: {scale.toFixed(2)}</li>
      </ul>
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
      />
    </>
  );
}