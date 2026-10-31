export const PLAYER_COLORS = ["orange", "aqua", "yellow", "purple", "green", "blue"] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export const PLAYER_COLOR_HEX: Record<PlayerColor | "red", string> = {
  red: "#da2010",
  orange: "#ff7f00",
  yellow: "#f6bd31",
  green: "#0ad70a",
  aqua: "#4aa4ff",
  blue: "#0010bd",
  purple: "#bf3fbf",
};

export const PLAYER_COLOR_RGBA: Record<PlayerColor | "red", Float32Array> = {
  red: new Float32Array([0.855, 0.125, 0.063, 1]),
  orange: new Float32Array([1, 0.498, 0, 1]),
  yellow: new Float32Array([0.965, 0.741, 0.192, 1]),
  green: new Float32Array([0.039, 0.843, 0.039, 1]),
  aqua: new Float32Array([0.29, 0.643, 1, 1]),
  blue: new Float32Array([0, 0.063, 0.741, 1]),
  purple: new Float32Array([0.749, 0.247, 0.749, 1]),
};
