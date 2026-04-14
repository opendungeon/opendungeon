import type { IconType } from "react-icons";

export type MenuButton = {
  label: string;
  Icon: IconType;
  onClick: () => void;
  active: boolean;
};

export function MenuButton({ label, Icon, onClick, active }: MenuButton) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      className="bg-[#222222] border-2 border-[#555555] hover:border-[#999999] data-[active=true]:bg-[#111111] active:bg-[#111111]
      p-3 text-center flex gap-2 items-center rounded-md duration-50 w-full"
    >
      <Icon size={18} color="white" />
      <h2 className="text-white">{label}</h2>
    </button>
  );
}
