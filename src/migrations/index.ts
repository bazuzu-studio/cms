import * as migration_20260924_075556_initial from './20260924_075556_initial';
import * as migration_20260928_193844_add_release_status from './20260928_193844_add_release_status';

export const migrations = [
  {
    up: migration_20260924_075556_initial.up,
    down: migration_20260924_075556_initial.down,
    name: '20260924_075556_initial',
  },
  {
    up: migration_20260928_193844_add_release_status.up,
    down: migration_20260928_193844_add_release_status.down,
    name: '20260928_193844_add_release_status'
  },
];
