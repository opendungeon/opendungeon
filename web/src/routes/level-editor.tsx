import { createFileRoute } from "@tanstack/react-router";
import GameWindow from "../components/GameWindow";
import LevelEditor from "../lib/level-editor";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/level-editor")({
  component: LevelEditorPage,
});

function LevelEditorPage() {
  const editor = useRef(new LevelEditor());
  const [activeTool, setActiveTool] = useState<LevelEditor["tool"]>(
    editor.current.tool,
  );

  useEffect(() => {
    editor.current.tool = activeTool;
  }, [activeTool]);

  return (
    <main className="grid justify-start">
      <aside className="text-white z-10 relative">
        <ul>
          {[
            {
              label: "Eraser",
              selected: activeTool.type === "brush" && activeTool.weight === 0,
              tool: { type: "brush", weight: 0 },
            },
            {
              label: "Brush",
              selected: activeTool.type === "brush" && activeTool.weight !== 0,
              tool: { type: "brush", weight: 1 },
            },
          ].map(({ label, selected, tool }) => (
            <li>
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
        {activeTool.type === "brush" && activeTool.weight !== 0 && (
          <div>
            <label>Difficult Terrain</label>
            <input
              type="checkbox"
              checked={activeTool.weight === 2}
              onChange={(ev) =>
                setActiveTool({
                  type: "brush",
                  weight: ev.target.checked ? 2 : 1,
                })
              }
            />
          </div>
        )}
      </aside>
      <GameWindow game={editor.current} />
    </main>
  );
}
