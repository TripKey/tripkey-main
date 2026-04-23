import { InputHTMLAttributes } from 'react';

type InputState = 'default' | 'error' | 'success';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  state?: InputState;
  errorMessage?: string;
};

const Input = ({
  name,
  type = 'text',
  state = 'default',
  errorMessage,
  ...rest
}: InputProps) => {
  return (
    <div>
      <input
        id={name}
        name={name}
        type={type}
        className={`input input-${state}`}
        {...rest}
      />
      {errorMessage && <p className="error">{errorMessage}</p>}
    </div>
  );
};

export default Input;
