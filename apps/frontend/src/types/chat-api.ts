import type { Card } from './grouping-api';
import type { CardCategory, Coordinates } from './grouping-api';

export type ChatContext = {
  interests: string[];
  constraints: string[];
};

export type ChatIntent =
  | 'update_context'
  | 'generate_cards'
  | 'need_clarification'
  | 'no_action';

export type ChatDuplicate = {
  name: string;
  reason: 'already_exists';
};

export type ChatParseRequest = {
  message: string;
  context: ChatContext;
  max_cards?: number;
};

export type ChatParseResponse = {
  intent: ChatIntent;
  reply: string;
  updated_context: ChatContext;
  suggested_cards: ChatSuggestedCard[];
  duplicates: ChatDuplicate[];
};

export type ChatSuggestedCardPayload = {
  place_id: string;
  name: string;
  category: CardCategory;
  classification: string;
  placement_status: string;
  is_ai_generated: boolean;
  allow_duplicate: boolean;
  estimated_duration_min: number | null;
  coordinates: Coordinates;
  location: string | null;
  address: string | null;
  time_constraint: string | null;
  user_context: string | null;
  tips: string | null;
  question_text: string | null;
  options: string[] | null;
  blocked_reason: string | null;
  tags: string[] | null;
  check_in: string | null;
  check_out: string | null;
  flight_number: string | null;
  flight_datetime: string | null;
  flight_role: string | null;
  search_alias: string | null;
};

export type ChatSuggestedCard = {
  candidate_id: string;
  card: ChatSuggestedCardPayload;
};

export type ChatCardSaveRequest = {
  cards: ChatSuggestedCard[];
};

export type ChatCardSaveResponse = {
  created_cards: Card[];
  duplicates: ChatDuplicate[];
};
