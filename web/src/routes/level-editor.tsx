import { createFileRoute } from "@tanstack/react-router";
import GameWindow from "../components/GameWindow";
import LevelEditor, { DEFAULT_TOOL } from "../lib/level-editor";
import { useRef } from "react";
import LevelEditorToolMenu from "../components/LevelEditorToolMenu";

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
