export type DumpErrorCode =
  | 'DUMP_TOO_SHORT'
  | 'DUMP_TOO_LONG'
  | 'DUMP_URL_NOT_ALLOWED';

export type DumpSubmitRequest = {
  dump_text: string;
};

export type DumpSubmitResponse = {
  job_id: string;
  status: 'pending';
};

export type ErrorResponse = {
  code: DumpErrorCode;
  message: string;
};
