// SaveShareCard — 확정 화면(SCR-05) 우측 사이드 하단. 저장/공유 액션 카드.
// 버튼 동작은 추후 연결 (UI 만).

import { Download, Share2 } from 'lucide-react';

const SaveShareCard = () => {
  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <h3 className="text-sm font-bold text-foreground">이 화면의 정체성</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        05는 일정표를 예쁘게 보여주는 단계가 아니라, 확정 직전에 놓치기 쉬운
        실무 항목과 카드 맥락을 다시 묶어주는 단계예요.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          <Download className="size-4" aria-hidden="true" />
          저장하기
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Share2 className="size-4" aria-hidden="true" />
          공유하기
        </button>
      </div>
    </section>
  );
};

export default SaveShareCard;
