export type DumpErrorCode =
  | 'DUMP_TOO_SHORT'
  | 'DUMP_TOO_LONG'
  | 'DUMP_URL_NOT_ALLOWED';

export type DumpSubmitRequest = {
  dump_text: string;
  departure_flight?: FlightInput; // 모두 optional — 백엔드도 nullable
  return_flight?: FlightInput; // 이번엔 미전송(아래 매핑 참고)
  accommodation_inputs?: AccommodationInput[];
};

export type DumpSubmitResponse = {
  job_id: string;
  status: 'pending';
};

export type ErrorResponse = {
  code: DumpErrorCode;
  message: string;
};

export type FlightInput = {
  departure_airport?: string;
  arrival_airport?: string;
  flight_number?: string;
  datetime?: string;
};

export type AccommodationInput = {
  name?: string;
  location?: string;
  check_in?: string;
  check_out?: string;
};
