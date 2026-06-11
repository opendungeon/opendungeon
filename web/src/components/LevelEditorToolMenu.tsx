import { useEffect, useState } from "react";
import LevelEditor, {
  type LevelEditorTool,
  type LevelEditorViewMode,
} from "../lib/level-editor";

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
      <aside className="z-10 relative">
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
                className="border-2 border-aurora-gray-1200 px-4 py-3 bg-aurora-gray-1100 cursor-pointer rounded data-[selected=true]:border-aurora-gray-400"
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
          <div className="text-white grid bg-aurora-gray-1200 rounded px-4 py-3">
            <div>
              {(
                [
                  {
                    label: "Texture",
                    selected: activeTool.type === "texturebrush",
                    tool: { type: "texturebrush", texture: null },
                    viewMode: "texture",
                  },
                  {
                    label: "Terrain",
                    selected: activeTool.type === "weightbrush",
                    tool: { type: "weightbrush", weight: 0 },
                    viewMode: "weight",
                  },
                ] as const
              ).map(({ label, selected, tool, viewMode }, i) => (
                <button
                  key={i}
                  data-selected={selected}
                  onClick={() => {
                    setActiveTool(tool);
                    onChangeViewMode(viewMode);
                  }}
                  className="bg-aurora-gray-1100 data-[selected=true]:bg-aurora-gray-700 px-4 py-3 rounded first:rounded-r-none last:rounded-l-none"
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTool.type === "texturebrush" && (
              <div>
                <fieldset>
                  {[
                    { texture: null, label: "Eraser" },
                    { texture: "grass", label: "Grass" },
                    { texture: "water", label: "Water" },
                    { texture: "mud", label: "Mud" },
                  ].map(({ texture, label }, i) => (
                    <div key={i}>
                      <input
                        id={`${texture}-texture-select`}
                        type="radio"
                        checked={activeTool.texture === texture}
                        onChange={() =>
                          setActiveTool({
                            texture,
                            type: "texturebrush",
                          })
                        }
                      />
                      <label htmlFor={`${texture}-texture-select`}>
                        {label}
                      </label>
                    </div>
                  ))}
                </fieldset>
              </div>
            )}
            {activeTool.type === "weightbrush" && (
              <div>
                <fieldset>
                  {[
                    { weight: 0, label: "None" },
                    { weight: 1, label: "Normal" },
                    { weight: 2, label: "Difficult" },
                  ].map(({ weight, label }, i) => (
                    <div key={i}>
                      <input
                        id={`${weight}-weight-select`}
                        type="radio"
                        checked={activeTool.weight === weight}
                        onChange={() =>
                          setActiveTool({
                            weight,
                            type: "weightbrush",
                          })
                        }
                      />
                      <label htmlFor={`${weight}-weight-select`}>{label}</label>
                    </div>
                  ))}
                </fieldset>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
