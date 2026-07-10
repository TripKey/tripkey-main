// PlaceCardBadge — PlaceCard 우상단 작은 배지

import {
  Activity,
  Home,
  MapPin,
  MoreHorizontal,
  Plane,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  CategoryMeta,
  PlaceCardBadgeSpec,
  PlaceCategory,
} from '@/types/grouping';

const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  place: { icon: MapPin, label: '장소' },
  lodging: { icon: Home, label: '숙소' },
  food: { icon: Utensils, label: '맛집' },
  activity: { icon: Activity, label: '활동' },
  shopping: { icon: ShoppingBag, label: '쇼핑' },
  transport: { icon: Plane, label: '교통' },
};

const STATUS_TONE_CLASS: Record<'fail' | 'done' | 'pending' | 'info', string> =
  {
    fail: 'bg-destructive/10 text-destructive',
    pending:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  };

const PlaceCardBadge = (props: PlaceCardBadgeSpec) => {
  if (props.kind === 'category') {
    const { icon: Icon, label } = CATEGORY_META[props.category];
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </span>
    );
  }

  if (props.kind === 'more') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/70">
        <MoreHorizontal className="size-3.5" aria-hidden="true" />
        {props.label ?? '기타'}
      </span>
    );
  }

  if (props.kind === 'ai') {
    return (
      <Badge className="border-transparent bg-primary/10 px-1.5 font-semibold text-primary dark:bg-primary/20 dark:text-primary">
        AI
      </Badge>
    );
  }

  return (
    <Badge
      className={cn('border-transparent px-1.5', STATUS_TONE_CLASS[props.tone])}
    >
      {props.tone === 'fail' && <X className="size-3" aria-hidden="true" />}
      {props.label}
    </Badge>
  );
};

export default PlaceCardBadge;
