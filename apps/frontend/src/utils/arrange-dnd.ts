// 배치 화면(SCR-04) 드래그앤드롭 공용 헬퍼.
// 좌측 카드 목록 ↔ Day 보드 ↔ Day 간 이동을 한 드롭 핸들러로 처리하려면
// "이 카드가 어디서 왔는지(출처)"를 drop 시점에 알아야 한다.
// dataTransfer 에 출처를 담아 직렬화/파싱한다.

/** 커스텀 MIME — payload(JSON)를 싣는다. */
export const ARRANGE_DND_MIME = 'application/x-arrange-card';

export type ArrangeDragPayload = {
  cardId: string;
  /** null = 좌측 "카드 목록", 그 외 = 출처 Day 컬럼 id */
  fromDayId: string | null;
};

/** dragstart 에서 호출 — payload + 하위호환용 text/plain(id) 를 함께 싣는다. */
export const setArrangeDragData = (
  dataTransfer: DataTransfer,
  payload: ArrangeDragPayload
): void => {
  dataTransfer.setData(ARRANGE_DND_MIME, JSON.stringify(payload));
  // Firefox 는 드래그 시작에 text/plain 이 필요. 구버전/외부 폴백용으로도 id 를 남긴다.
  dataTransfer.setData('text/plain', payload.cardId);
  dataTransfer.effectAllowed = 'move';
};

/** drop 에서 호출 — payload 를 복원한다. text/plain 만 있으면 좌측 목록 출처로 간주. */
export const readArrangeDragData = (
  dataTransfer: DataTransfer
): ArrangeDragPayload | null => {
  const raw = dataTransfer.getData(ARRANGE_DND_MIME);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ArrangeDragPayload>;
      if (typeof parsed?.cardId === 'string') {
        return { cardId: parsed.cardId, fromDayId: parsed.fromDayId ?? null };
      }
    } catch {
      // 손상된 payload 는 text/plain 폴백으로 처리
    }
  }
  const id = dataTransfer.getData('text/plain');
  return id ? { cardId: id, fromDayId: null } : null;
};
