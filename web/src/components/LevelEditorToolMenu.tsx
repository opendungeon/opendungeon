import { useEffect, useState } from "react";
import LevelEditor, {
  type LevelEditorTool,
  type LevelEditorViewMode,
} from "../lib/level-editor";
import BrushToolOptionMenu from "./BrushToolOptionMenu";

type LevelEditorToolMenuProps = {
  initialTool: LevelEditorTool;
  onChangeTool: (tool: LevelEditorTool) => void;
  onChangeViewMode: (viewMode: LevelEditorViewMode) => void;
};

export default function LevelEditorToolMenu({
  initialTool,
  onChangeTool,
  onChangeViewMode,
}: LevelEditorToolMenuProps) {
  const [activeTool, setActiveTool] = useState<LevelEditorTool>(initialTool);

  useEffect(() => {
    onChangeTool(activeTool);
  }, [activeTool]);

  return (
    <div className="grid grid-cols-2 p-6 w-screen">
      <aside className="z-10 relative justify-self-start">
        <ul className="grid gap-2 text-white w-3xs bg-aurora-gray-1200 rounded px-4 py-3">
          {[
            {
              label: "Brush",
              selected:
                activeTool.type === "weightbrush" ||
                activeTool.type === "texturebrush",
              tool: { type: "texturebrush", texture: null },
            },
            {
              label: "Measure",
              selected: activeTool.type === "measure",
              tool: { type: "measure", start: null },
            },
          ].map(({ label, selected, tool }, i) => (
            <li key={i} className="grid">
              <button
                data-selected={selected}
                onClick={() => setActiveTool(tool as LevelEditor["tool"])}
                className="border-2 border-aurora-gray-1200 px-4 py-3 bg-aurora-gray-1100 cursor-pointer rounded data-[selected=true]:border-aurora-gray-400 data-[selected=true]:bg-aurora-gray-900"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <aside className="z-10 relative justify-self-end">
        {(activeTool.type === "texturebrush" ||
          activeTool.type === "weightbrush") && (
          <BrushToolOptionMenu
            brush={activeTool}
            onChangeBrush={(brush) => {
              setActiveTool(brush);
              onChangeViewMode(
                brush.type === "texturebrush" ? "texture" : "weight",
              );
            }}
          />
        )}
      </aside>
    </div>
  );
}
