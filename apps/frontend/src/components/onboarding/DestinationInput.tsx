import './DestinationInput.css';

import { useOnboardingStore } from '../../utils/onboarding-store';

import DestinationDropdown from './DestinationDropdown';

const DEV_ALLOWED_DESTINATIONS = [
  '오사카',
  '도쿄',
  '교토',
  '후쿠오카',
  '방콕',
  '하노이',
  '다낭',
  '싱가포르',
  '타이베이',
  '파리',
  '런던',
  '뉴욕',
];

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

      <aside className="destination-input__dev-notice" role="note">
        <span className="destination-input__dev-badge">개발용 임시</span>
        <span className="destination-input__dev-text">
          백엔드 등록 도시(한글 완전일치만 검색됨):{' '}
          {DEV_ALLOWED_DESTINATIONS.join(' · ')}
        </span>
      </aside>
    </div>
  );
};

export default DestinationInput;
