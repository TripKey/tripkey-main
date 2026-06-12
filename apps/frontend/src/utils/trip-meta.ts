// 여행 상세(GET /trips/{id}) 응답에서 화면 공통 메타 라벨을 만드는 헬퍼.
// 그룹화/확정 화면이 동일한 표기를 쓰도록 한 곳에 모은다.

/** "YYYY-MM-DD" → 로컬 자정 Date. UTC 파싱으로 인한 하루 밀림을 피한다. */
const parseYmd = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const fmtShort = (date: Date): string =>
  `${date.getMonth() + 1}월 ${date.getDate()}일`;

/**
 * 시작일 + 여행 일수 → "5월 10일 ~ 5월 14일".
 * start_date 가 없으면(온보딩 미전송) '-' 를 반환한다.
 */
export const tripDateRangeLabel = (
  startDate: string | null | undefined,
  travelDays: number
): string => {
  const start = parseYmd(startDate);
  if (!start || travelDays <= 0) return '-';
  const end = new Date(start);
  end.setDate(end.getDate() + travelDays - 1);
  return `${fmtShort(start)} ~ ${fmtShort(end)}`;
};

/** 여행 일수 → "N박 M일" (1일이면 "당일"). */
export const tripDurationLabel = (travelDays: number): string => {
  if (travelDays <= 0) return '-';
  if (travelDays === 1) return '당일';
  return `${travelDays - 1}박 ${travelDays}일`;
};
