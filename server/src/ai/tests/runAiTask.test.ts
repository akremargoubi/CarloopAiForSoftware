import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { config } from '../../core/config.js';
import { closeTestDb, connectTestDb, resetAiConfig } from '../../core/tests/helpers.js';
import { AiLogModel } from '../AiLog.model.js';
import { AiConfigError, AiInvalidOutputError } from '../errors.js';
import { runAiTask } from '../runAiTask.js';

const schema = z.object({ answer: z.string(), score: z.number().min(0).max(1) });

function llmReply(content: string) {
  return new Response(
    JSON.stringify({ model: 'test/model', choices: [{ message: { content } }], usage: { total_tokens: 42 } }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

beforeAll(connectTestDb);
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('runAiTask', () => {
  it('returns the validated mock in demo mode and logs the call', async () => {
    const result = await runAiTask('test-mock', 'sys', 'hello', schema, { mock: () => ({ answer: 'ok', score: 0.5 }) });
    expect(result).toEqual({ answer: 'ok', score: 0.5 });
    const log = await AiLogModel.findOne({ module: 'test-mock' }).lean();
    expect(log).toMatchObject({ success: true, mock: true });
  });

  it('rejects an invalid mock (mocks go through the same validation)', async () => {
    await expect(
      runAiTask('test-bad-mock', 'sys', 'hello', schema, { mock: () => ({ answer: 'ok', score: 3 }) }),
    ).rejects.toBeInstanceOf(AiInvalidOutputError);
  });

  it('returns 503-style AiConfigError when the key is missing and AI_MOCK is off', async () => {
    config.ai.mock = false;
    const err = await runAiTask('test-config', 'sys', 'hello', schema, { mock: () => ({ answer: 'x', score: 0 }) }).catch((e) => e);
    expect(err).toBeInstanceOf(AiConfigError);
    expect(err.status).toBe(503);
    expect(err.message).toBe('Service IA non configuré');
    const log = await AiLogModel.findOne({ module: 'test-config' }).lean();
    expect(log).toMatchObject({ success: false, errorCode: 'AI_NOT_CONFIGURED' });
  });

  it('anonymizes the messages before calling the LLM', async () => {
    config.ai.apiKey = 'sk-test';
    const fetchMock = vi.fn().mockResolvedValue(llmReply('```json\n{"answer":"ok","score":1}\n```'));
    vi.stubGlobal('fetch', fetchMock);
    const result = await runAiTask(
      'test-anon',
      'system prompt',
      [{ role: 'user', content: 'Je suis Mariem Trabelsi, 98 765 432, mariem@mail.tn, voiture 123 TU 4567' }],
      schema,
      { knownNames: ['Mariem Trabelsi'] },
    );
    expect(result).toEqual({ answer: 'ok', score: 1 });
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0]).toEqual({ role: 'system', content: 'system prompt' });
    expect(sent.messages[1].content).toBe('Je suis [NOM], [TELEPHONE], [EMAIL], voiture [PLAQUE]');
    const log = await AiLogModel.findOne({ module: 'test-anon' }).lean();
    expect(log).toMatchObject({ success: true, mock: false, totalTokens: 42, piiMasked: 4 });
    expect(JSON.stringify(log)).not.toContain('Mariem');
  });

  it('retries once with the validation errors, then succeeds', async () => {
    config.ai.apiKey = 'sk-test';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(llmReply('{"answer":"ok","score":7}'))
      .mockResolvedValueOnce(llmReply('{"answer":"ok","score":0.7}'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(runAiTask('test-repair', 'sys', 'hi', schema)).resolves.toEqual({ answer: 'ok', score: 0.7 });
    const secondCall = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondCall.messages.at(-1).content).toContain('score');
  });

  it('throws AiInvalidOutputError after two invalid answers', async () => {
    config.ai.apiKey = 'sk-test';
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => llmReply('pas du json')));
    await expect(runAiTask('test-invalid', 'sys', 'hi', schema)).rejects.toBeInstanceOf(AiInvalidOutputError);
    const log = await AiLogModel.findOne({ module: 'test-invalid' }).lean();
    expect(log).toMatchObject({ success: false, errorCode: 'AI_INVALID_OUTPUT', attempts: 2 });
  });
});
