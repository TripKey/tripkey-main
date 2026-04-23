import Input from '../common/Input';

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
    <div>
      <h2>{title}</h2>

      <Input name={name} placeholder={placeholder} errorMessage={undefined} />
      <p>{subtitle}</p>
    </div>
  );
};

export default OnboardingForm;
