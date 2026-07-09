import { type PaintBucketTool } from "@/lib/game/level-editor";

type PaintBucketToolOptionMenuProps = {
  bucket: PaintBucketTool;
  onChangeBucket: (bucket: PaintBucketTool) => void;
};

export default function PaintBucketToolOptionMenu({
  bucket,
  onChangeBucket,
}: PaintBucketToolOptionMenuProps) {
  return (
    <div className="text-white grid bg-aurora-gray-1200 rounded px-4 py-3 grid gap-3 pointer-events-auto">
      <div>
        {(
          [
            {
              label: "Texture",
              selected: bucket.type === "texturepaintbucket",
              tool: { type: "texturepaintbucket", texture: null },
            },
            {
              label: "Terrain",
              selected: bucket.type === "weightpaintbucket",
              tool: { type: "weightpaintbucket", weight: 0 },
            },
          ] as const
        ).map(({ label, selected, tool }, i) => (
          <button
            key={i}
            data-selected={selected}
            onClick={() => {
              onChangeBucket(tool);
            }}
            className="bg-aurora-gray-1100 data-[selected=true]:bg-aurora-gray-900 px-4 py-3 first:rounded-l last:rounded-r"
          >
            {label}
          </button>
        ))}
      </div>
      {bucket.type === "weightpaintbucket" && (
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
                  checked={bucket.weight === weight}
                  onChange={() =>
                    onChangeBucket({
                      weight,
                      type: "weightpaintbucket",
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
