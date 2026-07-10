import type { Card } from './grouping-api';

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
  created_cards: Card[];
  duplicates: ChatDuplicate[];
};
