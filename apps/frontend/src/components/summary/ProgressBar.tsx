import './ProgressBar.css';

type Props = {
  percent: number;
  label?: string;
};

const ProgressBar = ({ percent, label }: Props) => (
  <div className="progress-bar">
    <div className="progress-bar__track">
      <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
    </div>
    {label && <span className="progress-bar__label">{label}</span>}
  </div>
);

export default ProgressBar;
