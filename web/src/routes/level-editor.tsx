import { createFileRoute } from "@tanstack/react-router";
import GameWindow from "../components/GameWindow";
import LevelEditor, { DEFAULT_TOOL } from "../lib/level-editor";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/level-editor")({
  component: LevelEditorPage,
});

function LevelEditorPage() {
  const editor = useRef(new LevelEditor());
  const [activeTool, setActiveTool] =
    useState<LevelEditor["tool"]>(DEFAULT_TOOL);

  useEffect(() => {
    editor.current.tool = activeTool;
  }, [activeTool]);

  return (
    <main className="grid justify-start">
      <aside className="text-white z-10 relative">
        <button
          onClick={() => {
            editor.current.viewMode =
              editor.current.viewMode === "texture" ? "weight" : "texture";
          }}
        >
          Change View Mode
        </button>
        <ul>
          {[
            {
              label: "Weight Brush",
              selected:
                activeTool.type === "weightbrush" && activeTool.weight !== 0,
              tool: { type: "weightbrush", weight: 1 },
            },
            {
              label: "Weight Eraser",
              selected:
                activeTool.type === "weightbrush" && activeTool.weight === 0,
              tool: { type: "weightbrush", weight: 0 },
            },
            {
              label: "Texture Brush",
              selected:
                activeTool.type === "texturebrush" && !!activeTool.texture,
              tool: { type: "texturebrush", texture: "grass" },
            },
            {
              label: "Texture Eraser",
              selected:
                activeTool.type === "texturebrush" && !activeTool.texture,
              tool: { type: "texturebrush", texture: null },
            },
          ].map(({ label, selected, tool }, i) => (
            <li key={i}>
              <button
                data-selected={selected}
                onClick={() => setActiveTool(tool as LevelEditor["tool"])}
                className="border-2 border-aurora-gray-1200 px-4 py-3 cursor-pointer data-[selected=true]:border-aurora-gray-400"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
        {activeTool.type === "weightbrush" && activeTool.weight !== 0 && (
          <div>
            <label>Difficult Terrain</label>
            <input
              type="checkbox"
              checked={activeTool.weight === 2}
              onChange={(ev) =>
                setActiveTool({
                  type: "weightbrush",
                  weight: ev.target.checked ? 2 : 1,
                })
              }
            />
          </div>
        )}
        {activeTool.type === "texturebrush" && !!activeTool.texture && (
          <div>
            <fieldset>
              <legend>Texture</legend>
              <div>
                <input
                  id="grass"
                  type="radio"
                  checked={activeTool.texture === "grass"}
                  onChange={() =>
                    setActiveTool({ type: "texturebrush", texture: "grass" })
                  }
                />
                <label htmlFor="grass">Grass</label>
              </div>
              <div>
                <input
                  id="water"
                  type="radio"
                  checked={activeTool.texture === "water"}
                  onChange={() =>
                    setActiveTool({ type: "texturebrush", texture: "water" })
                  }
                />
                <label htmlFor="water">Water</label>
              </div>
              <div>
                <input
                  id="mud"
                  type="radio"
                  checked={activeTool.texture === "mud"}
                  onChange={() =>
                    setActiveTool({ type: "texturebrush", texture: "mud" })
                  }
                />
                <label htmlFor="mud">Mud</label>
              </div>
            </fieldset>
          </div>
        )}
      </aside>
      <GameWindow game={editor} />
    </main>
  );
}
