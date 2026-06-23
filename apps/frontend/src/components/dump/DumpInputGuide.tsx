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
};

const aiInfoItems: AiInfoItem[] = [
  { icon: MapPin, label: '장소' },
  { icon: Calendar, label: '일정' },
  { icon: Clock, label: '시간' },
  { icon: Utensils, label: '맛집' },
  { icon: ArrowLeftRight, label: '이동' },
];

const tips: string[] = [
  '방문하고 싶은 장소와 시간대를 자유롭게 적어주세요',
  '꼭 가고 싶은 맛집이나 카페가 있다면 함께 적어주세요',
  '여행 스타일이나 선호하는 분위기도 알려주시면 좋아요',
];

const DumpInputGuide = () => {
  return (
    <div className="flex flex-col gap-3">
      {/* AI 정리 정보 카드 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            AI가 이런 정보도 함께 정리해요
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {aiInfoItems.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
            >
              <Icon size={14} className="text-gray-500" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* 입력 팁 카드 */}
      <div className="rounded-2xl bg-purple-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-purple-600" />
          <h3 className="text-sm font-semibold text-purple-700">입력 팁</h3>
        </div>
        <ul className="flex flex-col gap-1.5">
          {tips.map((tip) => (
            <li
              key={tip}
              className="flex items-start gap-2 text-xs text-gray-700"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-500" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DumpInputGuide;
