// Feature registry: ONE line per module. Comment a line out to disable the module.
// Each module exports a ClientFeature (routes, nav links, slots, global widgets).
export {};
export { default as search } from './search/module';
export { default as diagnostic } from './diagnostic/module';
export { default as quotes } from './quotes/module';
export { default as reviews } from './reviews/module';
export { default as maintenance } from './maintenance/module';
