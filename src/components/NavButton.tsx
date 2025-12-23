interface NavButtonProps {
  label?: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  ariaLabel: string;
}

export function NavButton({ label, icon, onClick, disabled, ariaLabel }: NavButtonProps) {
  const className = label
    ? 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed'
    : 'px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 active:bg-gray-700 focus:bg-gray-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    >
      {icon}
      {label}
    </button>
  );
}
