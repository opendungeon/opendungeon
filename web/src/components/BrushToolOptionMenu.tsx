import { type BrushTool } from "../lib/level-editor";

type BrushToolOptionMenuProps = {
  brush: BrushTool;
  onChangeBrush: (brush: BrushTool) => void;
};

export default function BrushToolOptionMenu({
  brush,
  onChangeBrush,
}: BrushToolOptionMenuProps) {
  return (
    <div className="text-white grid bg-aurora-gray-1200 rounded px-4 py-3 grid gap-3">
      <div>
        {(
          [
            {
              label: "Texture",
              selected: brush.type === "texturebrush",
              tool: { type: "texturebrush", texture: null },
            },
            {
              label: "Terrain",
              selected: brush.type === "weightbrush",
              tool: { type: "weightbrush", weight: 0 },
            },
          ] as const
        ).map(({ label, selected, tool }, i) => (
          <button
            key={i}
            data-selected={selected}
            onClick={() => {
              onChangeBrush(tool);
            }}
            className="bg-aurora-gray-1100 data-[selected=true]:bg-aurora-gray-900 px-4 py-3 first:rounded-l last:rounded-r"
          >
            {label}
          </button>
        ))}
      </div>
      {brush.type === "texturebrush" && (
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
                  checked={brush.texture === texture}
                  onChange={() =>
                    onChangeBrush({
                      texture,
                      type: "texturebrush",
                    })
                  }
                />
                <label htmlFor={`${texture}-texture-select`}>{label}</label>
              </div>
            ))}
          </fieldset>
        </div>
      )}
      {brush.type === "weightbrush" && (
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
                  checked={brush.weight === weight}
                  onChange={() =>
                    onChangeBrush({
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
  );
}
