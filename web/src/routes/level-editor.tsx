import { createFileRoute } from "@tanstack/react-router";
import GameWindow from "../components/GameWindow";
import LevelEditor, { DEFAULT_TOOL } from "../lib/level-editor";
import { useRef } from "react";
import LevelEditorToolMenu from "../components/LevelEditorToolMenu";
import api from "../lib/api";

export const Route = createFileRoute("/level-editor")({
  component: LevelEditorPage,
});

function LevelEditorPage() {
  const editor = useRef(new LevelEditor());

  return (
    <main className="grid justify-start">
      <LevelEditorToolMenu
        initialTool={DEFAULT_TOOL}
        onChangeTool={(tool) => {
          if (tool.type === "texturebrush") {
            if (tool.texture && !editor.current.hasTexture(tool.texture)) {
              editor.current.loadTexture(
                tool.texture,
                api.getCellTextureUrl(tool.texture).toString(),
              );
            }
          }
          editor.current.tool = tool;
        }}
        onChangeViewMode={(viewMode) => {
          editor.current.viewMode = viewMode;
        }}
      />
      <GameWindow game={editor} />
    </main>
  );
}
