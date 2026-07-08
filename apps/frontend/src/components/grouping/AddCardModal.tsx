// AddCardModal — 헤더 "카드 추가하기" 버튼으로 여는 중앙 모달.
// 한 번 입력하면 AI 가 먼저 정리한 뒤 카드 목록에 올라간다(처리 요청은 1차 stub).

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS = [
  { value: 'place', label: '장소' },
  { value: 'activity', label: '활동' },
  { value: 'transport', label: '교통수단' },
  { value: 'accommodation', label: '숙소' },
  { value: 'food', label: '맛집' },
  { value: 'etc', label: '기타' },
] as const;

const TRANSPORT_TYPE_OPTIONS = [
  { value: 'flight', label: '항공편' },
  { value: 'train', label: '기차' },
  { value: 'bus', label: '버스' },
  { value: 'etc', label: '기타' },
] as const;

const FLIGHT_ROLE_OPTIONS = [
  { value: 'outbound', label: '출발편' },
  { value: 'inbound', label: '귀국편' },
  { value: 'middle', label: '여행 중 이동' },
] as const;

export type AddCardCategory = (typeof CATEGORY_OPTIONS)[number]['value'];
export type AddCardMode = 'manual' | 'ai';
export type AddTransportType = (typeof TRANSPORT_TYPE_OPTIONS)[number]['value'];
export type AddFlightRole = (typeof FLIGHT_ROLE_OPTIONS)[number]['value'];

type FlightDayOption = {
  date: string;
  label: string;
};

export type AddCardDraft = {
  mode: AddCardMode;
  category: AddCardCategory;
  transportType: AddTransportType;
  name: string;
  prompt: string;
  region: string;
  /** 체류시간(분). 비워두면 0 */
  durationMin: number;
  timeMemo: string;
  memo: string;
  flightNumber: string;
  flightDatetime: string;
  flightRole: AddFlightRole;
  departureAirport: string;
  arrivalAirport: string;
};

type AddCardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripStartDate?: string | null;
  travelDays?: number | null;
  /** "처리 요청하기" — 1차는 stub. 닫는 동작은 onOpenChange(false) 로 호출부가 결정 */
  onSubmit?: (draft: AddCardDraft) => void;
};

// 패널들 textarea 와 동일한 입력 필드 스타일(단, 한 줄 입력은 h-11 고정).
const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none';

const AddCardModal = ({
  open,
  onOpenChange,
  tripStartDate,
  travelDays,
  onSubmit,
}: AddCardModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:duration-200 data-[state=closed]:duration-150">
          {/* Dialog.Content 는 닫히면 언마운트되므로 본문 입력 state 는 열 때마다 초기화된다 */}
          <AddCardForm
            onClose={() => onOpenChange(false)}
            tripStartDate={tripStartDate}
            travelDays={travelDays}
            onSubmit={onSubmit}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddCardModal;

// AddCardForm — 모달 본문(헤더 + 입력 폼 + 푸터). 입력 state 를 들고 있다.
const AddCardForm = ({
  onClose,
  tripStartDate,
  travelDays,
  onSubmit,
}: {
  onClose: () => void;
  tripStartDate?: string | null;
  travelDays?: number | null;
  onSubmit?: (draft: AddCardDraft) => void;
}) => {
  const [category, setCategory] = useState<AddCardCategory>('place');
  const [mode, setMode] = useState<AddCardMode>('manual');
  const [transportType, setTransportType] =
    useState<AddTransportType>('flight');
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('60');
  const [timeMemo, setTimeMemo] = useState('');
  const [memo, setMemo] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [flightDate, setFlightDate] = useState('');
  const [flightRole, setFlightRole] = useState<AddFlightRole>('outbound');
  const [flightDayIndex, setFlightDayIndex] = useState(0);
  const [flightHour, setFlightHour] = useState('09');
  const [flightMinute, setFlightMinute] = useState('00');
  const [departureAirport, setDepartureAirport] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');

  const flightDayOptions = buildFlightDayOptions(tripStartDate, travelDays);
  const usesTripDate = flightDayOptions.length > 0;
  const isManual = mode === 'manual';
  const isTransport = category === 'transport';
  const isFlight = isManual && isTransport && transportType === 'flight';

  useEffect(() => {
    if (flightRole === 'outbound') {
      if (flightDayOptions.length > 0) {
        setFlightDayIndex(0);
      }
      setFlightHour('09');
      setFlightMinute('00');
      return;
    }
    if (flightRole === 'inbound') {
      if (flightDayOptions.length > 0) {
        setFlightDayIndex(flightDayOptions.length - 1);
      }
      setFlightHour('18');
      setFlightMinute('00');
      return;
    }
    if (flightDayOptions.length > 0) {
      setFlightDayIndex((current) =>
        Math.min(Math.max(current, 0), flightDayOptions.length - 1)
      );
    }
    setFlightHour('12');
    setFlightMinute('00');
  }, [flightDayOptions.length, flightRole]);

  const resolvedFlightDatetime = usesTripDate
    ? buildFlightDatetimeFromDay(
        flightDayOptions[flightDayIndex],
        flightHour,
        flightMinute
      )
    : buildFlightDatetimeFromDate(flightDate, flightHour, flightMinute);

  const canSubmit = isManual
    ? isFlight
      ? hasAnyFlightInput({
          flightNumber,
          flightDate,
          departureAirport,
          arrivalAirport,
          includeDatetime: !usesTripDate,
        })
      : name.trim().length > 0
    : prompt.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({
      mode,
      category,
      transportType,
      name: isManual
        ? isFlight
          ? fallbackFlightCardName({
              flightNumber,
              flightRole,
              departureAirport,
              arrivalAirport,
            })
          : name.trim()
        : fallbackAiCardName(prompt, category),
      prompt: prompt.trim(),
      region: region.trim(),
      durationMin: Number(duration) || 0,
      timeMemo: timeMemo.trim(),
      memo: memo.trim(),
      flightNumber: flightNumber.trim(),
      flightDatetime: resolvedFlightDatetime,
      flightRole,
      departureAirport: departureAirport.trim(),
      arrivalAirport: arrivalAirport.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      {/* 헤더 */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Dialog.Title className="text-xl font-bold text-foreground">
            카드 추가하기
          </Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="닫기"
              className="-mt-1 -mr-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          알고 있는 일정은 바로 카드로 추가하고, 더 찾아볼 내용은 AI에게 요청해보세요.
        </Dialog.Description>
      </div>

      {/* 본문(스크롤) */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">추가 방식</p>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {[
              { value: 'manual', label: '직접 추가' },
              { value: 'ai', label: 'AI에게 요청' },
            ].map((option) => {
              const active = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMode(option.value as AddCardMode)}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isManual
              ? '이미 알고 있는 장소, 숙소, 교통편을 일정 후보 카드로 추가해요.'
              : '아직 정하지 못한 장소나 조건을 적으면 AI가 후보나 확인 질문으로 정리해요.'}
          </p>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {isManual
              ? '예상 결과: 카드가 추가되고, 위치 보강이 필요한 항목은 잠시 처리 중으로 표시돼요.'
              : '예상 결과: 확정 카드, 선택이 필요한 카드, 입력이 필요한 카드 중 하나로 정리돼요.'}
          </p>
        </div>

        {/* 카테고리(단일 선택) */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">카테고리</p>
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORY_OPTIONS.map((option) => {
              const active = category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {isManual && isTransport && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              교통수단 종류
            </p>
            <div className="grid grid-cols-4 gap-2">
              {TRANSPORT_TYPE_OPTIONS.map((option) => {
                const active = transportType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTransportType(option.value)}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isManual && isFlight ? (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                항공편 정보
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                출발편과 귀국편은 일정의 시작과 종료 기준으로 활용돼요. 여행 중 이동은 일반 교통 카드로 남아요.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                항공편 구분
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FLIGHT_ROLE_OPTIONS.map((option) => {
                  const active = flightRole === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFlightRole(option.value)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                          : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="편명" htmlFor="add-card-flight-number">
                <input
                  id="add-card-flight-number"
                  value={flightNumber}
                  onChange={(event) => setFlightNumber(event.target.value)}
                  placeholder="예: KE723, LJ211"
                  autoFocus
                  className={INPUT_CLASS}
                />
              </Field>
              {usesTripDate ? (
                <Field label="날짜" htmlFor="add-card-flight-day">
                  <select
                    id="add-card-flight-day"
                    value={flightDayIndex}
                    onChange={(event) =>
                      setFlightDayIndex(Number(event.target.value))
                    }
                    className={INPUT_CLASS}
                  >
                    {flightDayOptions.map((option, index) => (
                      <option key={option.date} value={index}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="날짜" htmlFor="add-card-flight-date">
                  <input
                    id="add-card-flight-date"
                    type="date"
                    value={flightDate}
                    onChange={(event) => setFlightDate(event.target.value)}
                    className={INPUT_CLASS}
                  />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="시" htmlFor="add-card-flight-hour">
                <input
                  id="add-card-flight-hour"
                  value={flightHour}
                  onChange={(event) =>
                    setFlightHour(sanitizeTimePart(event.target.value, 23))
                  }
                  onBlur={() =>
                    setFlightHour((value) => normalizeTimePart(value, 23))
                  }
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="HH"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="분" htmlFor="add-card-flight-minute">
                <input
                  id="add-card-flight-minute"
                  value={flightMinute}
                  onChange={(event) =>
                    setFlightMinute(sanitizeTimePart(event.target.value, 59))
                  }
                  onBlur={() =>
                    setFlightMinute((value) => normalizeTimePart(value, 59))
                  }
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="MM"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="출발 공항" htmlFor="add-card-departure-airport">
                <input
                  id="add-card-departure-airport"
                  value={departureAirport}
                  onChange={(event) => setDepartureAirport(event.target.value)}
                  placeholder="예: 인천공항 또는 ICN"
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="도착 공항" htmlFor="add-card-arrival-airport">
                <input
                  id="add-card-arrival-airport"
                  value={arrivalAirport}
                  onChange={(event) => setArrivalAirport(event.target.value)}
                  placeholder="예: 간사이공항 또는 KIX"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>
        ) : isManual ? (
          <Field label="카드 이름" htmlFor="add-card-name">
            <input
              id="add-card-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={getCardNamePlaceholder(category, transportType)}
              autoFocus
              className={INPUT_CLASS}
            />
          </Field>
        ) : (
          <Field label="AI에게 맡길 내용" htmlFor="add-card-prompt">
            <textarea
              id="add-card-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={getAiPromptPlaceholder(category)}
              rows={5}
              autoFocus
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
          </Field>
        )}

        {!isFlight && (
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={isManual ? '지역' : '지역 힌트'}
              htmlFor="add-card-region"
            >
              <input
                id="add-card-region"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder={getRegionPlaceholder(category, mode)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="체류시간(분)" htmlFor="add-card-duration">
              <input
                id="add-card-duration"
                type="number"
                inputMode="numeric"
                min={0}
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        )}

        {/* 시간 메모 */}
        {!isFlight && (
          <Field label="시간 메모" htmlFor="add-card-time-memo">
            <input
              id="add-card-time-memo"
              value={timeMemo}
              onChange={(event) => setTimeMemo(event.target.value)}
              placeholder={getTimeMemoPlaceholder(category)}
              className={INPUT_CLASS}
            />
          </Field>
        )}

        {isManual && (
          <Field label="추가 메모" htmlFor="add-card-memo">
            <textarea
              id="add-card-memo"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder={getMemoPlaceholder(category, transportType)}
              rows={4}
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
          </Field>
        )}
      </div>

      {/* 푸터 */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-5"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            type="submit"
            className="h-10 px-5 font-semibold"
            disabled={!canSubmit}
          >
            {isManual ? '카드 추가하기' : 'AI로 카드 만들기'}
          </Button>
        </div>
      </div>
    </form>
  );
};

// Field — "라벨 + 입력 한 줄" 한 칸. label/input 을 htmlFor 로 묶어준다.
const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-foreground"
    >
      {label}
    </label>
    {children}
  </div>
);

const fallbackAiCardName = (
  prompt: string,
  category: AddCardCategory
): string => {
  const firstLine = prompt.trim().split('\n')[0]?.trim();
  if (firstLine) return firstLine.slice(0, 40);
  const label = CATEGORY_OPTIONS.find((option) => option.value === category)?.label;
  return label ? `${label} 요청` : 'AI 요청';
};

const getCardNamePlaceholder = (
  category: AddCardCategory,
  transportType: AddTransportType
): string => {
  if (category === 'transport') {
    return transportType === 'train'
      ? '예: 오사카에서 교토 가는 JR'
      : transportType === 'bus'
        ? '예: 공항 리무진 버스'
        : '예: 난바역까지 택시 이동';
  }
  if (category === 'accommodation') return '예: 난바역 근처 호텔';
  if (category === 'food') return '예: 도톤보리 타코야키';
  if (category === 'activity') return '예: 유니버설 스튜디오 재팬';
  if (category === 'etc') return '예: 오사카 주유패스 구매';
  return '예: 교토 철학의 길';
};

const getAiPromptPlaceholder = (category: AddCardCategory): string => {
  if (category === 'food') {
    return '예: 도톤보리 근처에서 저녁으로 갈 만한 오사카 맛집을 2~3개 골라줘.';
  }
  if (category === 'transport') {
    return '예: 간사이공항에서 난바 숙소까지 가는 방법을 카드로 정리해줘.';
  }
  if (category === 'accommodation') {
    return '예: 난바역 근처에서 2박 할 숙소 후보를 비교해보고 싶어.';
  }
  if (category === 'activity') {
    return '예: 비 오는 날에도 갈 수 있는 오사카 실내 코스를 추천해줘.';
  }
  if (category === 'etc') {
    return '예: 출국 전에 챙겨야 할 준비물을 카드로 정리해줘.';
  }
  return '예: 교토에서 반나절 동안 들를 만한 장소 후보를 추천해줘.';
};

const getRegionPlaceholder = (
  category: AddCardCategory,
  mode: AddCardMode
): string => {
  if (mode === 'ai') {
    if (category === 'transport') return '예: 간사이공항, 난바';
    if (category === 'food') return '예: 도톤보리, 난바';
    return '예: 오사카, 교토';
  }
  if (category === 'transport') return '예: 오사카 시내';
  if (category === 'accommodation') return '예: 난바역 근처';
  if (category === 'food') return '예: 도톤보리';
  return '예: 교토';
};

const getTimeMemoPlaceholder = (category: AddCardCategory): string => {
  if (category === 'food') return '예: 저녁 식사, 웨이팅 길면 패스';
  if (category === 'transport') return '예: 체크인 전에 이동';
  if (category === 'accommodation') return '예: 체크인은 15시 이후';
  if (category === 'activity') return '예: 오전 방문, 비 오면 변경';
  return '예: 오전 방문, 1시간 정도';
};

const getMemoPlaceholder = (
  category: AddCardCategory,
  transportType: AddTransportType
): string => {
  if (category === 'transport') {
    return transportType === 'flight'
      ? '터미널, 수하물, 좌석처럼 기억해둘 내용을 적어주세요.'
      : '예약 여부, 승강장, 환승처럼 기억해둘 내용을 적어주세요.';
  }
  if (category === 'accommodation') {
    return '예약 번호, 체크인 조건, 짐 보관 여부를 적어둘 수 있어요.';
  }
  if (category === 'food') {
    return '대표 메뉴, 예약 여부, 웨이팅 정보를 적어둘 수 있어요.';
  }
  return '가고 싶은 이유나 같이 확인할 내용을 적어주세요.';
};

const buildFlightDayOptions = (
  startDate: string | null | undefined,
  travelDays: number | null | undefined
): FlightDayOption[] => {
  const start = parseYmd(startDate);
  const days = Math.max(0, Math.floor(travelDays ?? 0));
  if (!start || days <= 0) return [];

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: formatYmd(date),
      label: `Day ${index + 1} · ${date.getMonth() + 1}월 ${date.getDate()}일`,
    };
  });
};

const buildFlightDatetimeFromDay = (
  option: FlightDayOption | undefined,
  hour: string,
  minute: string
): string => {
  if (!option) return '';
  return `${option.date}T${normalizeFlightTime(hour, minute)}`;
};

const buildFlightDatetimeFromDate = (
  date: string,
  hour: string,
  minute: string
): string => {
  const trimmed = date.trim();
  if (!trimmed) return '';
  return `${trimmed}T${normalizeFlightTime(hour, minute)}`;
};

const sanitizeTimePart = (value: string, max: number): string => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '';
  const numeric = Math.min(Number(digits), max);
  return String(numeric).padStart(digits.length, '0');
};

const normalizeTimePart = (value: string, max: number): string => {
  const digits = value.replace(/\D/g, '').slice(0, 2);
  if (!digits) return '00';
  return String(Math.min(Number(digits), max)).padStart(2, '0');
};

const normalizeFlightTime = (hour: string, minute: string): string =>
  `${normalizeTimePart(hour, 23)}:${normalizeTimePart(minute, 59)}`;

const parseYmd = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasAnyFlightInput = ({
  flightNumber,
  flightDate,
  departureAirport,
  arrivalAirport,
  includeDatetime,
}: {
  flightNumber: string;
  flightDate: string;
  departureAirport: string;
  arrivalAirport: string;
  includeDatetime: boolean;
}): boolean =>
  Boolean(
    flightNumber.trim() ||
      (includeDatetime && flightDate.trim()) ||
      departureAirport.trim() ||
      arrivalAirport.trim()
  );

const fallbackFlightCardName = ({
  flightNumber,
  flightRole,
  departureAirport,
  arrivalAirport,
}: {
  flightNumber: string;
  flightRole: AddFlightRole;
  departureAirport: string;
  arrivalAirport: string;
}): string => {
  const departure = departureAirport.trim();
  const arrival = arrivalAirport.trim();
  if (departure && arrival) return `${departure} → ${arrival}`;

  const roleLabel =
    FLIGHT_ROLE_OPTIONS.find((option) => option.value === flightRole)?.label ??
    '항공편';
  const number = flightNumber.trim();
  return number ? `${number} ${roleLabel}` : roleLabel;
};
