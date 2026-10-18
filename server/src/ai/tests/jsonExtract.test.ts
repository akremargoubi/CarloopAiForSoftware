import { describe, expect, it } from 'vitest';
import { AiInvalidOutputError } from '../errors.js';
import { extractJson } from '../jsonExtract.js';

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('removes ```json fences', () => {
    expect(extractJson('```json\n{"a": [1, 2]}\n```')).toEqual({ a: [1, 2] });
    expect(extractJson('```\n{"b": true}\n```')).toEqual({ b: true });
  });

  it('ignores prose around the JSON object', () => {
    expect(extractJson('Voici la réponse : {"ok": "oui"} Bonne journée !')).toEqual({ ok: 'oui' });
  });

  it('handles a BOM and arrays', () => {
    expect(extractJson(String.fromCharCode(0xfeff) + '[{"x":1}]')).toEqual([{ x: 1 }]);
  });

  it('throws AiInvalidOutputError when no JSON can be found', () => {
    expect(() => extractJson('Je ne sais pas.')).toThrow(AiInvalidOutputError);
    expect(() => extractJson('{"a": 1')).toThrow(AiInvalidOutputError);
  });
});
