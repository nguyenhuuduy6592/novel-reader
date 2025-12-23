interface ThemeOption {
  value: string;
  label: string;
}

interface ThemeSelectProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: readonly ThemeOption[] | readonly number[];
}

export function ThemeSelect({ label, value, onChange, options }: ThemeSelectProps) {
  const isObjectOptions = typeof options[0] === 'object';

  return (
    <div>
      <label className="block mb-1 font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border rounded-md"
      >
        {isObjectOptions ? (
          (options as readonly ThemeOption[]).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))
        ) : (
          (options as readonly number[]).map((opt) => (
            <option key={opt} value={opt}>{opt}px</option>
          ))
        )}
      </select>
    </div>
  );
}
