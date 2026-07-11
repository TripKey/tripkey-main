// SidePanel — 화면 오른쪽에서 슬라이드로 열리는 세로 패널 셸(Radix Dialog 기반).

import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

type SidePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 패널 본문. falsy 면(=열 내용이 없을 때) 접근성용 최소 마크업만 렌더 */
  children?: ReactNode;
};

const SidePanel = ({ open, onOpenChange, children }: SidePanelProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* 배경 dim. 클릭하면 닫힘(radix 기본) */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />

        {/* 오른쪽에 붙는 세로 패널. 모바일은 풀폭, 그 위로는 ~512px(max-w-lg) */}
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-card shadow-xl outline-none sm:max-w-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right data-[state=open]:duration-300 data-[state=closed]:duration-200">
          {children || (
            // 내용 없이 열린 경우(이론상 없음) — radix a11y 경고 방지용 최소 마크업.
            <>
              <Dialog.Title className="sr-only">상세</Dialog.Title>
              <Dialog.Description className="sr-only">
                표시할 상세 정보가 없습니다.
              </Dialog.Description>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SidePanel;
