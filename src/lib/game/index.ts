export const GRID_HEIGHT = 256;
export const GRID_WIDTH = 256;

export type GameMessage = {
  content: string;
  username: string;
  avatarUri: string | null;
};

export enum GameMenuTab {
  Chat = "game-icons:chat-bubble",
  Players = "game-icons:tabletop-players",
  Levels = "game-icons:treasure-map",
  Characters = "game-icons:character",
  Settings = "game-icons:cog",
}

export enum GameMenuToolIcon {
  Select = "bxs:pointer",
  Measure = "mdi:ruler",
  Shape = "material-symbols:shapes",
  Draw = "material-symbols:draw",
  Dice = "fa-solid:dice-d20",
}

export enum MeasureShape {
  Path = "boxicons:path",
  Line = "ant-design:line-outlined",
  Square = "akar-icons:square",
  Circle = "akar-icons:circle",
  Cone = "fluent:cone-16-regular",
}

export type GameTool = { type: string; icon: GameMenuToolIcon };
