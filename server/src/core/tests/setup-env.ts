// Runs before every test file, before the config is imported.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-enough-characters';
process.env.OPENROUTER_API_KEY = '';
process.env.OPENROUTER_MODEL = 'test/model';
process.env.AI_MOCK = 'true';
