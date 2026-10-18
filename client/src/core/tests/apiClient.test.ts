import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from '../api/client';

function axiosError(status?: number, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() };
  const response = status ? { status, data, statusText: '', headers: {}, config } : undefined;
  return new AxiosError('fail', code, config, null, response);
}

describe('toApiError', () => {
  it('reads the server error format', () => {
    const err = toApiError(axiosError(429, { error: { code: 'AI_QUOTA_EXCEEDED', message: 'Quota' } }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, code: 'AI_QUOTA_EXCEEDED', message: 'Quota' });
  });

  it('detects network errors and client timeouts', () => {
    expect(toApiError(axiosError()).code).toBe('NETWORK_ERROR');
    expect(toApiError(axiosError(undefined, undefined, 'ECONNABORTED')).code).toBe('CLIENT_TIMEOUT');
  });
});
