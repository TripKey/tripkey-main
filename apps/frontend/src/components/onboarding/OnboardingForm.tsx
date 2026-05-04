import Input from '../common/Input';
import './OnboardingForm.css';

type OnboardingFormProps = {
  title: string;
  name: string;
  placeholder: string;
  subtitle: string;
  value?: string;
  onChange?: (value: string) => void;
};

const OnboardingForm = ({
  title,
  name,
  placeholder,
  subtitle,
  value,
  onChange,
}: OnboardingFormProps) => {
  return (
    <div className="onboarding-form">
      <h2 className="onboarding-form__title">{title}</h2>
      <Input
        name={name}
        placeholder={placeholder}
        errorMessage={undefined}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      <p className="onboarding-form__subtitle">{subtitle}</p>
    </div>
  );
};

export default OnboardingForm;
