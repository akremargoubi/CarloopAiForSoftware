// Feature registry: ONE line per module. Comment a line out to disable the module.
// Each module exports a FeatureModule (router mounted under /api + optional seed).
export {};
export { default as search } from './search/index.js';
export { default as diagnostic } from './diagnostic/index.js';
export { default as quotes } from './quotes/index.js';
export { default as reviews } from './reviews/index.js';
export { default as maintenance } from './maintenance/index.js';
