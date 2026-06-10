import './DestinationInput.css';

import { RECOMMENDED_DESTINATIONS } from '../../dev-fixtures/allowed-destinations';
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

      {import.meta.env.MODE === 'development' && (
        <aside className="destination-input__dev-notice" role="note">
          <span className="destination-input__dev-badge">개발용 임시</span>
          <span className="destination-input__dev-text">
            백엔드 등록 도시(한글 완전일치만 검색됨):{' '}
            {RECOMMENDED_DESTINATIONS.map((d) => d.name).join(' · ')}
          </span>
        </aside>
      )}
    </div>
  );
};

export default DestinationInput;
