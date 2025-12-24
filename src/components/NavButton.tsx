interface NavButtonProps {
  label?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
}

export function NavButton({ label, icon, onClick, disabled, ariaLabel, className: additionalClassName, ariaExpanded, ariaControls }: NavButtonProps) {
  const baseClassName = label
    ? 'flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed'
    : 'px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 focus:bg-blue-700 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed';

  const className = additionalClassName ? `${baseClassName} ${additionalClassName}` : baseClassName;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
    >
      {icon}
      {label}
    </button>
  );
}
