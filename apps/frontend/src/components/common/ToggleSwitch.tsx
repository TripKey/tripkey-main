type ToggleSwitchProps = {
  isChecked?: boolean;
  onChange?: (checked: boolean) => void;
};

const ToggleSwitch = ({ isChecked, onChange }: ToggleSwitchProps) => {
  return (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={(e) => onChange?.(e.target.checked)}
    />
  );
};

export default ToggleSwitch;
