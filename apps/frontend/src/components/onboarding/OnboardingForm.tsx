import Input from '../common/Input';

import DestinationInput from './DestinationInput';
import './OnboardingForm.css';

type OnboardingFormType = 'default' | 'destination';

type OnboardingFormProps = {
  title: string;
  subtitle: string;
  type?: OnboardingFormType;
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
};

const OnboardingForm = ({
  title,
  subtitle,
  type = 'default',
  name,
  placeholder,
  value,
  onChange,
}: OnboardingFormProps) => {
  return (
    <div className="onboarding-form">
      <h2 className="onboarding-form__title">{title}</h2>

      {type === 'destination' ? (
        <DestinationInput placeholder={placeholder} />
      ) : (
        <Input
          name={name ?? ''}
          placeholder={placeholder}
          errorMessage={undefined}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      )}

      <p className="onboarding-form__subtitle">{subtitle}</p>
    </div>
  );
};

export default OnboardingForm;
