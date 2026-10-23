import { SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  entryFile: 'src/main.ts',
  enableBarrelLess: true,
  modules: {
    'src/app/core': 'core',
    'src/app/core/api-client': 'api-client',
    'src/app/features/<feature>': 'feature:<feature>',
    'src/app/features/<feature>/contract': 'contract:<feature>',
    'src/app/shared': 'shared',
    'src/environments': 'env',
  },
  depRules: {
    root: ['core', 'api-client', 'feature:*', 'contract:*', 'shared', 'env'],
    'feature:*': ['core', 'api-client', 'contract:*', 'shared', 'env'],
    'contract:*': ['api-client'],
    core: ['api-client', 'contract:*', 'shared', 'env'],
    'api-client': [],
    shared: ['env'],
    env: [],
  },
};
