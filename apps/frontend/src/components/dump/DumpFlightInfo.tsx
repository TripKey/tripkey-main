import { Input } from '@/components/ui/input';

import { useDumpStore } from '../../utils/dump-store';

import { DumpDateTimeField } from './DumpDateTimeField';

// 항공편 코드: 영문·숫자만 허용하고 대문자로 통일 (예: ke123 → KE123)
const sanitizeFlightNumber = (value: string) =>
  value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

type FlightSection = {
  key: 'departure' | 'return';
  label: string;
  badgeClass: string;
};

const sections: FlightSection[] = [
  {
    key: 'departure',
    label: '출발',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'return',
    label: '귀국',
    badgeClass: 'bg-red-100 text-red-700',
  },
];

const DumpFlightInfo = () => {
  const flightForm = useDumpStore((s) => s.flightForm);
  const updateFlight = useDumpStore((s) => s.actions.updateFlight);

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => {
        const row = flightForm[section.key];
        return (
          <div
            key={section.key}
            className="rounded-xl border border-gray-200 p-4"
          >
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold mb-3 ${section.badgeClass}`}
            >
              {section.label}
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">공항</label>
                <Input
                  className="h-9 text-sm bg-white"
                  placeholder="예: 인천국제공항"
                  value={row.airport}
                  onChange={(e) =>
                    updateFlight(section.key, 'airport', e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  항공편
                </label>
                <Input
                  className="h-9 text-sm bg-white"
                  placeholder="예: KE123"
                  value={row.flightNumber}
                  onChange={(e) =>
                    updateFlight(
                      section.key,
                      'flightNumber',
                      sanitizeFlightNumber(e.target.value)
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">시간</label>
                <DumpDateTimeField
                  value={row.time}
                  onChange={(v) => updateFlight(section.key, 'time', v)}
                  placeholder="날짜·시간 선택"
                  min={
                    section.key === 'return'
                      ? flightForm.departure.time
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DumpFlightInfo;
