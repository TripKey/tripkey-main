// PanelActions — SidePanel 하단에 고정되는 액션 버튼 행 컨테이너.

import type { ReactNode } from 'react';

const PanelActions = ({ children }: { children: ReactNode }) => {
  return (
    <div className="shrink-0 border-t border-border px-6 py-4">
      <div className="flex gap-3">{children}</div>
    </div>
  );
};

export default PanelActions;
