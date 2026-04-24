import Input from '../common/Input';
import './OnboardingForm.css';

type OnboardingFormProps = {
  title: string;
  name: string;
  placeholder: string;
  subtitle: string;
};

const OnboardingForm = ({
  title,
  name,
  placeholder,
  subtitle,
}: OnboardingFormProps) => {
  return (
    <div className="onboarding-form">
      <h2 className="onboarding-form__title">{title}</h2>
      <Input name={name} placeholder={placeholder} errorMessage={undefined} />
      <p className="onboarding-form__subtitle">{subtitle}</p>
    </div>
  );
};

export default OnboardingForm;
