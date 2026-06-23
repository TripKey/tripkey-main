export type OnboardingRequest = {
  tripName: string;
  destinations: string[];
  travel_days: number;
  companion_count: number;
  has_flight: boolean;
  has_accommodation: boolean;
};

export type OnboardingResponse = {
  trip_id: string;
  created_at: string;
};

export type OnboardingErrorResponse = {
  code: 'VALIDATION_ERROR';
  message: string;
};

export type Destination = {
  name: string;
  country: string;
  place_id: string;
};

export type DestinationSearchResponse = {
  results: Destination[];
};
