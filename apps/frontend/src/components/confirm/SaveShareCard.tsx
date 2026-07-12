// SaveShareCard — 확정 화면(SCR-05) 우측 사이드 하단. 저장/공유 액션 카드.
// 공유하기: 확정 화면은 tripId 만으로 인증 없이 조회되므로, 같은 URL 을 그대로 공유한다.
//   Web Share API(모바일 네이티브 공유) → 없으면 클립보드 복사로 폴백.
// 저장하기: 아직 준비 중 — 프로필 버튼과 동일하게 Tooltip 안내만.

import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SaveShareCardProps = {
  tripId: string | null;
};

const SaveShareCard = ({ tripId }: SaveShareCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!tripId) return;

    // shared=1 : 공유 링크로 들어온 방문자는 확정 화면만 읽기 전용으로 보게 한다.
    const shareUrl = `${window.location.origin}/confirm?tripId=${tripId}&shared=1`;

    // 모바일 등 Web Share API 지원 환경에서는 네이티브 공유 시트를 띄운다.
    // text 를 넣으면 "링크 복사" 시 브라우저가 url 뒤에 text 를 이어붙여
    // tripId 파라미터가 오염되므로(=서버 404), url 만 공유한다.
    if (navigator.share) {
      try {
        await navigator.share({ url: shareUrl });
        return;
      } catch (error) {
        // 사용자가 공유 시트를 취소한 경우는 조용히 무시.
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        // 그 외 실패는 클립보드 복사로 폴백.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 복사해 공유하세요.', shareUrl);
    }
  };

  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <h3 className="text-sm font-bold text-foreground">이 화면의 정체성</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        05는 일정표를 예쁘게 보여주는 단계가 아니라, 확정 직전에 놓치기 쉬운
        실무 항목과 카드 맥락을 다시 묶어주는 단계예요.
      </p>

      <div className="mt-4 flex items-center gap-2">
        {/* 저장하기는 준비 중 — 프로필 버튼과 동일하게 Tooltip 안내만. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="저장하기 (준비 중)"
              className="inline-flex cursor-default items-center gap-1.5 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              <Download className="size-4" aria-hidden="true" />
              저장하기
            </button>
          </TooltipTrigger>
          <TooltipContent>저장 기능은 준비 중이에요</TooltipContent>
        </Tooltip>

        <button
          type="button"
          onClick={handleShare}
          disabled={!tripId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Share2 className="size-4" aria-hidden="true" />
          {copied ? '링크 복사됨' : '공유하기'}
        </button>
      </div>
    </section>
  );
};

export default SaveShareCard;
