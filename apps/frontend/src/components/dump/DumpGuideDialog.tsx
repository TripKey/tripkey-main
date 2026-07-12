import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type GuideOption = {
  id: string;
  label: string;
  sentence: string;
};

type DumpGuideDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (text: string) => void;
};

const PACE_OPTIONS: GuideOption[] = [
  {
    id: 'relaxed',
    label: '여유롭게',
    sentence: '여유롭게 둘러보는 일정을 원해요.',
  },
  {
    id: 'packed',
    label: '알차게',
    sentence: '짧은 시간에도 알차게 둘러보고 싶어요.',
  },
  {
    id: 'spontaneous',
    label: '즉흥적으로',
    sentence: '상황에 따라 유연하게 움직이고 싶어요.',
  },
];

const INTEREST_OPTIONS: GuideOption[] = [
  { id: 'food', label: '맛집', sentence: '현지 맛집' },
  { id: 'cafe', label: '카페', sentence: '분위기 좋은 카페' },
  { id: 'sightseeing', label: '관광', sentence: '대표 관광지' },
  { id: 'shopping', label: '쇼핑', sentence: '쇼핑' },
  { id: 'nature', label: '자연', sentence: '자연과 풍경' },
  { id: 'activity', label: '체험', sentence: '현지 체험' },
];

const PRIORITY_OPTIONS: GuideOption[] = [
  {
    id: 'route',
    label: '짧은 동선',
    sentence: '이동 동선이 너무 길지 않았으면 좋겠어요.',
  },
  {
    id: 'budget',
    label: '예산',
    sentence: '가격 대비 만족도가 좋은 곳을 선호해요.',
  },
  {
    id: 'local',
    label: '현지 분위기',
    sentence: '관광객용 장소보다 현지 분위기를 느끼고 싶어요.',
  },
  {
    id: 'photo',
    label: '사진',
    sentence: '사진 찍기 좋은 장소도 가고 싶어요.',
  },
];

const AVOID_OPTIONS: GuideOption[] = [
  {
    id: 'waiting',
    label: '긴 웨이팅',
    sentence: '웨이팅이 너무 긴 곳은 피하고 싶어요.',
  },
  {
    id: 'early',
    label: '이른 일정',
    sentence: '아침 일찍 시작하는 일정은 피하고 싶어요.',
  },
  {
    id: 'crowds',
    label: '붐비는 곳',
    sentence: '지나치게 붐비는 장소는 피하고 싶어요.',
  },
  {
    id: 'long-travel',
    label: '장거리 이동',
    sentence: '한 장소를 위해 오래 이동하는 일정은 피하고 싶어요.',
  },
];

const joinKorean = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')}과 ${items.at(-1)}`;
};

const OptionGroup = ({
  title,
  description,
  options,
  selected,
  onToggle,
}: {
  title: string;
  description: string;
  options: GuideOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) => (
  <section>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option.id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              active
                ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                : 'border-input bg-background text-foreground hover:bg-muted/60'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </section>
);

const DumpGuideDialog = ({
  open,
  onOpenChange,
  onAdd,
}: DumpGuideDialogProps) => {
  const [pace, setPace] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [avoidances, setAvoidances] = useState<string[]>([]);

  const toggleSingle = (id: string) =>
    setPace((prev) => (prev[0] === id ? [] : [id]));
  const toggleMany =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
      setter((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );

  const generatedText = useMemo(() => {
    const sentences: string[] = [];
    const paceOption = PACE_OPTIONS.find((option) => option.id === pace[0]);
    if (paceOption) sentences.push(paceOption.sentence);

    const interestLabels = INTEREST_OPTIONS.filter((option) =>
      interests.includes(option.id)
    ).map((option) => option.sentence);
    if (interestLabels.length > 0) {
      sentences.push(`${joinKorean(interestLabels)}에 관심이 많아요.`);
    }

    for (const option of PRIORITY_OPTIONS) {
      if (priorities.includes(option.id)) sentences.push(option.sentence);
    }
    for (const option of AVOID_OPTIONS) {
      if (avoidances.includes(option.id)) sentences.push(option.sentence);
    }

    sentences.push(
      '아직 정하지 못한 장소나 맛집은 제 취향에 맞게 추천받고 싶어요.'
    );
    return sentences.join(' ');
  }, [avoidances, interests, pace, priorities]);

  const hasSelection =
    pace.length + interests.length + priorities.length + avoidances.length > 0;

  const handleAdd = () => {
    onAdd(generatedText);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>어떤 여행을 원하세요?</DialogTitle>
          <DialogDescription>
            취향을 골라주시면 여행 정보 입력을 시작할 문장을 만들어드릴게요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 sm:grid-cols-2">
          <OptionGroup
            title="여행 속도"
            description="한 가지만 선택할 수 있어요"
            options={PACE_OPTIONS}
            selected={pace}
            onToggle={toggleSingle}
          />
          <OptionGroup
            title="관심사"
            description="여러 개 선택할 수 있어요"
            options={INTEREST_OPTIONS}
            selected={interests}
            onToggle={toggleMany(setInterests)}
          />
          <OptionGroup
            title="중요한 기준"
            description="장소와 일정을 고를 때 참고해요"
            options={PRIORITY_OPTIONS}
            selected={priorities}
            onToggle={toggleMany(setPriorities)}
          />
          <OptionGroup
            title="피하고 싶은 것"
            description="원하지 않는 일정도 알려주세요"
            options={AVOID_OPTIONS}
            selected={avoidances}
            onToggle={toggleMany(setAvoidances)}
          />
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold text-primary">생성될 문장</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {generatedText}
          </p>
        </div>

        <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm leading-6 text-muted-foreground">
          문장을 입력창에 추가한 뒤, 꼭 가고 싶은 장소나 이미 예약한 일정이
          있다면 직접 이어서 적어주세요.
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={!hasSelection} onClick={handleAdd}>
            입력창에 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DumpGuideDialog;
