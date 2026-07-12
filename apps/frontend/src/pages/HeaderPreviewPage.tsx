import { Plus } from 'lucide-react';

import Header, { type StepId } from '@/components/header/Header';
import { Button } from '@/components/ui/button';

const STEP_IDS: StepId[] = [
  'onboarding',
  'dump',
  'organize',
  'arrange',
  'confirm',
];

const HeaderPreviewPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="border-b border-border">
        <div className="bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variant 1 — default (no props)
        </div>
        <Header />
      </section>

      <section className="mt-8 border-b border-border">
        <div className="bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variant 2 — currentStepId &quot;dump&quot; + actions slot
        </div>
        <Header
          currentStepId="dump"
          destination="후쿠오카"
          extraDestinations={0}
          travelers={3}
          dateRange="6월 1일 ~ 6월 5일"
          actions={
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              카드 추가하기
            </Button>
          }
        />
      </section>

      <section className="mt-8 border-b border-border">
        <div className="bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variant 3 — showTripMeta=false + currentStepId &quot;confirm&quot;
        </div>
        <Header showTripMeta={false} currentStepId="confirm" />
      </section>

      <section className="mt-8">
        <div className="bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variant 4 — currentStepId 전체 순회 (Stepper 상태 확인용)
        </div>
        <div className="flex flex-col gap-4 px-6 py-4">
          {STEP_IDS.map((id) => (
            <div key={id} className="rounded border border-border">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground">
                currentStepId=&quot;{id}&quot;
              </div>
              <Header currentStepId={id} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HeaderPreviewPage;
