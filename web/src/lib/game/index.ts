import type { APIProfile } from "$lib/api";

export type GameMessage = {
  content: string;
  isSystemMessage: boolean;
  playerProfile: APIProfile;
};

export enum GameMenuTab {
  Chat = "material-symbols:chat",
  Players = "material-symbols:person",
  Levels = "material-symbols:map-outline",
  Settings = "material-symbols:settings",
}

export enum GameMenuTool {
  Select = "bxs:pointer",
  Measure = "mdi:ruler",
  Shape = "material-symbols:shapes",
  Draw = "material-symbols:draw",
  Dice = "fa-solid:dice-d20",
}
