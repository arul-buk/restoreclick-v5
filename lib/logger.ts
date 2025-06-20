// lib/logger.ts
import pino from 'pino';

// This logger will just produce standard, fast JSON logs.
const logger = pino({
  level: 'debug',
  base: {
    service: 'studio-boilerplate-v2',
  },
});

export default logger;