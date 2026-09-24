import * as migration_20260924_075556_initial from './20260924_075556_initial';

export const migrations = [
  {
    up: migration_20260924_075556_initial.up,
    down: migration_20260924_075556_initial.down,
    name: '20260924_075556_initial'
  },
];
