import { rmSync } from 'node:fs';
import { defineConfig } from 'orval';

const target = './src/app/core/api-client';

export default defineConfig({
  api: {
    input: './openapi/openapi.yaml',
    output: {
      mode: 'tags-split',
      target,
      client: 'angular',
      baseUrl: '/api',
      formatter: 'prettier',
    },
    hooks: {
      // Orval's root index.ts turns the client into a barrel Sheriff refuses deep imports from; `indexFiles: false` breaks the schemas import.
      afterAllFilesWrite: () => rmSync(`${target}/index.ts`, { force: true }),
    },
  },
});
