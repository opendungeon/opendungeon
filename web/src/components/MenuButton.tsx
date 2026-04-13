import type { IconType } from "react-icons";

export type MenuButton = {
  label: string;
  Icon: IconType;
  onClick: () => void;
};

export function MenuButton({ label, Icon, onClick }: MenuButton) {
  return (
    <button
      onClick={onClick}
      className="bg-[#222222] border-2 border-[#555555] hover:border-[#999999] p-3 text-center flex gap-2 items-center rounded-md duration-50 w-full"
    >
      <Icon size={18} color="white" />
      <h2 className="text-white">{label}</h2>
    </button>
  );
}
