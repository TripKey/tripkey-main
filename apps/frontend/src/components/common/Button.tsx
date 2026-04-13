import './Button.css';

type ButtonProps = {
  variant: 'filled' | 'outlined';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

const Button = ({ variant, children, onClick, disabled }: ButtonProps) => {
  return (
    <button
      className={`btn btn-${variant}`}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
