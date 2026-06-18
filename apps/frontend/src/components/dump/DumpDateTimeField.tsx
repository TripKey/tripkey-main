import { format, isSameDay, isValid, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const DATE_FORMAT = 'yyyy-MM-dd';

const parseValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return { date: undefined as Date | undefined, time: '' };
  const [datePart, timePart = ''] = trimmed.split(' ');
  const date = parse(datePart, DATE_FORMAT, new Date());
  return { date: isValid(date) ? date : undefined, time: timePart };
};

const buildValue = (date: Date | undefined, time: string) => {
  if (!date) return '';
  const datePart = format(date, DATE_FORMAT);
  return time ? `${datePart} ${time}` : datePart;
};

const formatDisplay = (value: string) => {
  const { date, time } = parseValue(value);
  if (!date) return value; // 구버전 자유 텍스트는 그대로
  const datePart = format(date, 'M월 d일', { locale: ko });
  return time ? `${datePart} ${time}` : datePart;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
};

export const DumpDateTimeField = ({
  value,
  onChange,
  placeholder,
  min,
}: Props) => {
  const [open, setOpen] = useState(false);
  const { date, time } = parseValue(value);
  const { date: minDate, time: minTime } = parseValue(min ?? '');
  const hasValue = value.trim().length > 0;

  // 같은 날이면서 min 시각보다 이르면 min 시각으로 끌어올림
  const clampTime = (d: Date | undefined, t: string) => {
    if (d && minDate && minTime && isSameDay(d, minDate) && t && t < minTime) {
      return minTime;
    }
    return t;
  };

  const handleDateSelect = (d: Date | undefined) => {
    onChange(buildValue(d, clampTime(d, time)));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const baseDate = date ?? new Date();
    onChange(buildValue(baseDate, clampTime(baseDate, e.target.value)));
  };

  const sameAsMin = !!(date && minDate && isSameDay(date, minDate));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 w-full justify-start gap-1.5 px-2.5 text-sm font-normal',
            !hasValue && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="size-3.5 text-gray-400" />
          <span className="truncate">
            {hasValue ? formatDisplay(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          defaultMonth={date ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          locale={ko}
          autoFocus
        />
        <div className="flex items-center gap-2 border-t border-border pt-2.5">
          <label className="text-xs text-muted-foreground">시간</label>
          <Input
            type="time"
            value={time}
            min={sameAsMin ? minTime || undefined : undefined}
            onChange={handleTimeChange}
            className="h-8 flex-1"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DumpDateTimeField;
