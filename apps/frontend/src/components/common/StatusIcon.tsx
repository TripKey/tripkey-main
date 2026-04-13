import './StatusIcon.css';

type IconKind = 'logo' | 'error' | 'warning' | 'info';

type StatusIconProps = {
  kind: IconKind;
};

const iconMap: Record<IconKind, string> = {
  logo: 'T',
  error: '!',
  warning: '⚠',
  info: '⊞',
};

const StatusIcon = ({ kind }: StatusIconProps) => {
  return (
    <div className={`status-icon status-icon-${kind}`}>
      <span className="status-icon-symbol">{iconMap[kind]}</span>
    </div>
  );
};

export default StatusIcon;
