import './DestinationInput.css';

import { useOnboardingStore } from '../../utils/onboarding-store';

import DestinationDropdown from './DestinationDropdown';

const DestinationInput = ({ placeholder }: { placeholder?: string }) => {
  const destinations = useOnboardingStore((s) => s.form.destinations);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const handleRemove = (dest: string) => {
    setForm({ destinations: destinations.filter((d) => d !== dest) });
  };

  return (
    <div className="destination-input__wrapper">
      <div className="destination-input__box">
        {destinations.map((dest) => (
          <span key={dest} className="destination-input__tag">
            {dest}
            <button type="button" onClick={() => handleRemove(dest)}>
              ×
            </button>
          </span>
        ))}
        <DestinationDropdown placeholder={placeholder} />
      </div>
    </div>
  );
};

export default DestinationInput;
