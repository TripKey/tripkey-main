export type ChatContextOption = {
  value: string;
  label: string;
};

export const CHAT_INTEREST_OPTIONS: ChatContextOption[] = [
  { value: 'food', label: '맛집' },
  { value: 'cafe', label: '카페' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'landmark', label: '관광지' },
  { value: 'culture_art', label: '문화·예술' },
  { value: 'history', label: '역사' },
  { value: 'nature', label: '자연' },
  { value: 'activity', label: '액티비티' },
  { value: 'night_view', label: '야경' },
  { value: 'local_experience', label: '로컬 체험' },
  { value: 'photography', label: '사진' },
  { value: 'relaxation', label: '휴식' },
];

export const CHAT_CONSTRAINT_OPTIONS: ChatContextOption[] = [
  { value: 'low_walking', label: '적게 걷기' },
  { value: 'rainy_day_option', label: '우천 대비' },
  { value: 'relaxed_pace', label: '느긋한 일정' },
  { value: 'with_children', label: '아이 동반' },
  { value: 'with_parents', label: '부모님 동반' },
  { value: 'wheelchair_accessible', label: '휠체어 접근' },
  { value: 'indoor_focused', label: '실내 중심' },
  { value: 'public_transit', label: '대중교통 중심' },
  { value: 'budget_friendly', label: '저예산' },
  { value: 'late_hours', label: '늦은 시간 가능' },
];

export const chatContextLabel = (value: string, options: ChatContextOption[]) =>
  options.find((option) => option.value === value)?.label ?? value;
