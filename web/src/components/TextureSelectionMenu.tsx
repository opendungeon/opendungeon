import { useEffect, useState } from "react";
import type { APICellTexture } from "@/lib/api";
import api from "@/lib/api";

type TextureSelectionMenuProps = {
  selected: string | null;
  onSelect: (texture: string | null) => void;
};

export default function TextureSelectionMenu({
  selected,
  onSelect,
}: TextureSelectionMenuProps) {
  const [textures, setTextures] = useState<APICellTexture[]>([]);

  useEffect(() => {
    api.listCellTextures().then((res) => {
      if (res.ok) {
        setTextures(res.textures);
      }
    });
  }, []);

  return (
    <div className="text-white grid bg-aurora-gray-1200 rounded px-4 py-3 grid gap-3 pointer-events-auto max-h-[33vh]">
      <ul className="flex flex-wrap gap-4">
        <li>
          <button
            data-selected={selected === null}
            onClick={() => onSelect(null)}
            className="bg-aurora-gray-1300 py-2 px-4 h-full rounded grid gap-1 data-[selected=true]:bg-aurora-gray-1100 data-[selected=true]:border-2 data-[selected=true]:border-white"
          >
            <span className="w-[128px]">Eraser</span>
          </button>
        </li>
        {textures.map(({ key, displayName }, i) => (
          <li key={i}>
            <button
              data-selected={key === selected}
              onClick={() => onSelect(key)}
              className="bg-aurora-gray-1300 py-2 px-4 rounded grid gap-1 data-[selected=true]:bg-aurora-gray-1100 data-[selected=true]:border-2 data-[selected=true]:border-white"
            >
              <img
                alt={`${displayName} cell texture`}
                src={api.getCellTextureUrl(key).toString()}
                width={128}
                height={64}
                aria-hidden="true"
                className="pointer-events-none"
              />
              <span>{displayName}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
