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
      <ul className="grid w-min relative z-10">
        <li>
          <button
            onClick={() =>
              levelEditor?.setMode({ type: "panning", isDragging: false })
            }
            className="text-white p-4 bg-red-500"
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
            }}
            className="text-white p-4 bg-blue-500"
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
            }}
            className="text-white p-4 bg-blue-500"
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
            }}
            className="text-white p-4 bg-blue-500"
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