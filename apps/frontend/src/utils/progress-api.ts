import type { ParseJobStatusResponse } from '../types/progress';

import { apiClient } from './api-client';

export const fetchParseJobStatus = async (
  tripId: string,
  jobId: string
): Promise<ParseJobStatusResponse> => {
  const response = await apiClient.get<ParseJobStatusResponse>(
    `/trips/${tripId}/parse/jobs/${jobId}/status`
  );
  return response.data;
};
