import {
  ArrowLeftRight,
  Calendar,
  Clock,
  Lightbulb,
  MapPin,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react';

type AiInfoItem = {
  icon: LucideIcon;
  label: string;
  className: string;
};

const aiInfoItems: AiInfoItem[] = [
  { icon: MapPin, label: '장소', className: 'bg-violet-50 text-violet-700' },
  { icon: Calendar, label: '일정', className: 'bg-blue-50 text-blue-700' },
  { icon: Clock, label: '시간', className: 'bg-cyan-50 text-cyan-700' },
  { icon: Utensils, label: '맛집', className: 'bg-teal-50 text-teal-700' },
  {
    icon: ArrowLeftRight,
    label: '이동',
    className: 'bg-emerald-50 text-emerald-700',
  },
];

const tips: string[] = [
  '방문하고 싶은 장소와 시간대를 자유롭게 적어주세요',
  '꼭 가고 싶은 맛집이나 카페가 있다면 함께 적어주세요',
  '여행 스타일이나 선호하는 분위기도 알려주시면 좋아요',
];

/** AI가 정리해주는 정보 안내 — 입력창 위에 배치해 무엇을 적으면 되는지 맥락 제공 */
export const DumpAiInfoCard = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          AI가 이런 정보도 함께 정리해요
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {aiInfoItems.map(({ icon: Icon, label, className }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${className}`}
          >
            <Icon size={14} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** 입력 팁 — 입력창 아래 배치 */
export const DumpTipsCard = () => {
  return (
    <div className="rounded-2xl bg-primary/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-primary">입력 팁</h3>
      </div>
      <ul className="flex flex-col gap-1.5">
        {tips.map((tip) => (
          <li
            key={tip}
            className="flex items-start gap-2 text-xs text-foreground"
          >
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
};
