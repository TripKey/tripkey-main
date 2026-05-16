export type CardCategory =
  | 'place'
  | 'activity'
  | 'transport'
  | 'accommodation'
  | 'food'
  | 'etc';

export type CardClassification =
  | 'confirmed'
  | 'open_question'
  | 'undecided'
  | 'unassigned';

export type CardActionType =
  | 'input_required'
  | 'select_required'
  | 'fix_required'
  | 'review_only';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Card = {
  instance_id: string;
  place_id: string | null;
  name: string;
  category: CardCategory;
  classification: CardClassification;
  placement_status: string;
  processing_status: string;
  action_type: CardActionType;
  can_exclude: boolean;
  allow_duplicate: boolean;
  is_excluded: boolean;
  is_ai_generated: boolean;
  estimated_duration_min: number | null;
  coordinates: Coordinates | null;
  location: string | null;
  address: string | null;
  time_constraint: string | null;
  question_text: string | null;
  options: string[] | null;
  blocked_reason: string | null;
  user_context: string | null;
  tips: string | null;
  tags: string[] | null;
  source: string | null;
  day: number | null;
  day_order: number | null;
  notes: string | null;
  memo: string | null;
  check_in: string | null;
  check_out: string | null;
  flight_number: string | null;
  flight_datetime: string | null;
  flight_role: string | null;
};

export type AlertCard = {
  id: string;
  type: string;
  category: string | null;
  scope: string | null;
  day: number | null;
  message: string;
  related_instance_ids: string[];
};

export type CardsResponse = {
  cards: Card[];
  context_summary: string | null;
  alert_cards: AlertCard[];
};

export type Groups03Response = {
  view: '03';
  input_required: Card[];
  select_required: Card[];
  fix_required: Card[];
  review_only: Card[];
  excluded: Card[];
};

export type CardAddRequest = {
  name: string;
  category: CardCategory;
  location?: string;
  estimated_duration_min?: number;
  time_constraint?: string;
  memo?: string;
  check_in?: string;
  check_out?: string;
  flight_number?: string;
};

export type CardPatchRequest = {
  allow_duplicate?: boolean;
  classification?: CardClassification;
  is_excluded?: boolean;
  notes?: string;
  memo?: string;
  check_in?: string;
  check_out?: string;
  flight_number?: string;
  location?: string;
  time_constraint?: string;
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
};
