// Public API of the shared AI service, used by every feature module.
export { runAiTask, isAiMockMode, type RunAiTaskOptions, type UserInput } from './runAiTask.js';
export { anonymize, anonymizeText, PLACEHOLDERS } from './anonymizer.js';
export { extractJson } from './jsonExtract.js';
export type { ChatMessage } from './llmClient.js';
export {
  AiError,
  AiConfigError,
  AiInvalidOutputError,
  AiQuotaError,
  AiTimeoutError,
  AiUpstreamError,
} from './errors.js';
