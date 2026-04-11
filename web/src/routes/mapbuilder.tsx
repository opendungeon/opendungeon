import { createFileRoute } from "@tanstack/react-router";
import LevelEditor from "../components/LevelEditor";

export const Route = createFileRoute("/mapbuilder")({
  component: MapBuilder,
});

function MapBuilder() {
  return <LevelEditor />;
}
