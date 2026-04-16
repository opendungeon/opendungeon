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
      className="bg-aurora-gray-200 border-2 border-aurora-gray-500 hover:border-aurora-gray-900 data-[active=true]:bg-aurora-gray-100 active:bg-aurora-gray-100
      p-3 text-center flex gap-2 items-center rounded-md duration-50 w-full"
    >
      <Icon size={18} color="white" />
      <h2 className="text-white">{label}</h2>
    </button>
  );
}
