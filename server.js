/** Backwards-compatible entrypoint for the documented src bootstrap. */
import { app, bootstrap } from './src/index.js';

export { app, bootstrap };

if (process.argv[1]?.endsWith('server.js')) {
  bootstrap();
}