import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../../core/config.js';
import { resetAiConfig } from '../../core/tests/helpers.js';
import { AiConfigError, AiInvalidOutputError, AiQuotaError, AiTimeoutError, AiUpstreamError } from '../errors.js';
import { callLlm } from '../llmClient.js';

const messages = [{ role: 'user' as const, content: 'hello' }];

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

const okBody = {
  model: 'test/model',
  choices: [{ message: { content: '{"ok":true}' } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

describe('llmClient', () => {
  beforeEach(() => {
    resetAiConfig();
    config.ai.apiKey = 'sk-test';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetAiConfig();
  });

  it('returns the content and the token usage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, okBody));
    vi.stubGlobal('fetch', fetchMock);
    const res = await callLlm(messages);
    expect(res).toEqual({ content: '{"ok":true}', model: 'test/model', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(JSON.parse(init.body).model).toBe('test/model');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(init.body).models).toBeUndefined();
  });

  it('sends the comma-separated fallback models to OpenRouter', async () => {
    config.ai.model = 'a/primary:free, b/backup:free';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, okBody));
    vi.stubGlobal('fetch', fetchMock);
    await callLlm(messages);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('a/primary:free');
    expect(body.models).toEqual(['a/primary:free', 'b/backup:free']);
  });

  it('throws AiConfigError when the key is missing or rejected', async () => {
    config.ai.apiKey = '';
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiConfigError);
    config.ai.apiKey = 'sk-bad';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'bad key' })));
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiConfigError);
  });

  it('retries once on 429 then succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { 'retry-after': '0' }))
      .mockResolvedValueOnce(jsonResponse(200, okBody));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLlm(messages)).resolves.toMatchObject({ content: '{"ok":true}' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws AiQuotaError after the retry when the quota is still exceeded', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'retry-after': '0' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiQuotaError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws AiUpstreamError on repeated 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => jsonResponse(503, {}, { 'retry-after': '0' })));
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiUpstreamError);
  });

  it('throws AiTimeoutError when the request is aborted by the timeout', async () => {
    config.ai.timeoutMs = 20;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      ),
    );
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiTimeoutError);
  });

  it('throws AiInvalidOutputError when the body has no content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(200, { choices: [] })));
    await expect(callLlm(messages)).rejects.toBeInstanceOf(AiInvalidOutputError);
  });
});
