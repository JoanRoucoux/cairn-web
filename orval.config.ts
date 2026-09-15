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
      // Orval 8.30 started writing a root index.ts, which makes the generated client a barrel
      // module that Sheriff then refuses every deep import from. `indexFiles: false` is not the
      // way out: it also splits cairnAPI.schemas.ts into files the services then fail to import.
      afterAllFilesWrite: () => rmSync(`${target}/index.ts`, { force: true }),
    },
  },
});
