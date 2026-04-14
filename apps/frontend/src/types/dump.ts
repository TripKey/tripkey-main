export type DumpErrorCode =
  | 'DUMP_TOO_SHORT'
  | 'DUMP_TOO_LONG'
  | 'DUMP_URL_NOT_ALLOWED';

export interface DumpSubmitRequest {
  dumpText: string;
}

export interface DumpSubmitResponse {
  jobId: string;
  status: 'pending';
}

export interface ErrorResponse {
  code: DumpErrorCode;
  message: string;
}
