import './Button.css';

type ButtonProps = {
  variant: 'filled' | 'outlined';
  children: React.ReactNode;
  onClick?: () => void;
};

const Button = ({ variant, children, onClick }: ButtonProps) => {
  return (
    <button className={`btn btn-${variant}`} type="button" onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;
