import './ToggleSwitch.css';

type ToggleSwitchProps = {
  isChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
};

const ToggleSwitch = ({ isChecked, onChange, disabled }: ToggleSwitchProps) => {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={isChecked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="toggle-track" />
      <span className="toggle-thumb" />
    </label>
  );
};

export default ToggleSwitch;
