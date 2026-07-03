import { useEffect, useState } from "react";
import LevelEditor, {
  type LevelEditorTool,
  type LevelEditorViewMode,
} from "../lib/games/level-editor";
import BrushToolOptionMenu from "./BrushToolOptionMenu";
import PaintBucketToolOptionMenu from "./PaintBucketToolOptionMenu";
import TextureSelectionMenu from "./TextureSelectionMenu";

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
  }, [activeTool, onChangeTool]);

  return (
    <div className="grid grid-cols-2 p-6 w-screen h-full">
      <aside className="z-10 relative justify-self-start pointer-events-none">
        <ul className="grid gap-2 text-white w-3xs bg-aurora-gray-1200 rounded px-4 py-3 pointer-events-auto">
          {[
            {
              label: "Brush",
              selected:
                activeTool.type === "weightbrush" ||
                activeTool.type === "texturebrush",
              tool: { type: "texturebrush", texture: null },
            },
            {
              label: "Paint Bucket",
              selected:
                activeTool.type === "weightpaintbucket" ||
                activeTool.type === "texturepaintbucket",
              tool: { type: "texturepaintbucket", texture: null },
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
                onClick={() => {
                  onChangeViewMode("texture");
                  setActiveTool(tool as LevelEditor["tool"]);
                }}
                className="border-2 border-aurora-gray-1200 px-4 py-3 bg-aurora-gray-1100 cursor-pointer rounded data-[selected=true]:border-aurora-gray-400 data-[selected=true]:bg-aurora-gray-900"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <aside className="z-10 relative justify-self-end pointer-events-none">
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
        {(activeTool.type === "texturepaintbucket" ||
          activeTool.type === "weightpaintbucket") && (
          <PaintBucketToolOptionMenu
            bucket={activeTool}
            onChangeBucket={(bucket) => {
              setActiveTool(bucket);
              onChangeViewMode(
                bucket.type === "texturepaintbucket" ? "texture" : "weight",
              );
            }}
          />
        )}
      </aside>
      <footer className="col-span-2 z-10 content-end pointer-events-none">
        {(activeTool.type === "texturebrush" ||
          activeTool.type === "texturepaintbucket") && (
          <TextureSelectionMenu
            selected={activeTool.texture}
            onSelect={(brush) => {
              setActiveTool({ ...activeTool, texture: brush });
            }}
          />
        )}
      </footer>
    </div>
  );
}
