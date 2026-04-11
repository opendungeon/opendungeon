import {
  useLayoutEffect,
  useRef,
  useState,
  type WheelEventHandler,
} from "react";
import LevelEditor from "../lib/level-editor";

const MAX_SCALE = 3.0;
const MIN_SCALE = 0.15;

export default function LevelEditorComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [levelEditor, setLevelEditor] = useState<LevelEditor>();
  const [scale, setScale] = useState(1.0);

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
      <ul>
        <li>
          <button
            onClick={() => levelEditor?.setMode("panning")}
            className="text-white p-4 bg-red-500"
          >
            pan
          </button>
        </li>
        <li>
          <button
            onClick={() => levelEditor?.setMode("painting")}
            className="text-white p-4 bg-blue-500"
          >
            paint
          </button>
        </li>
        <li className="text-white">Zoom: {scale.toFixed(2)}</li>
      </ul>
      <div
        ref={containerRef}
        className="absolute inset-0 -z-10"
        onWheel={handleWheel}
      />
    </>
  );
}
