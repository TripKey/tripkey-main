import { Input } from '@/components/ui/input';

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
  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => (
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
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">항공편</label>
              <Input className="h-9 text-sm bg-white" placeholder="예: KE123" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">시간</label>
              <Input className="h-9 text-sm bg-white" placeholder="예: 09:30" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DumpFlightInfo;
