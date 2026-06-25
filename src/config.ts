import type { Resources, ResourceType } from './types';

export const CONFIG = {
  hexSize: 40,
  hexSpacing: 1.05,
  tickIntervalMs: 100,
  waveBaseTimer: 30,
  waveTimerPerStage: 5,

  camera: {
    panSpeed: 8,
    zoomMin: 0.4,
    zoomMax: 2.0,
    zoomStep: 0.1,
  },

  resources: {
    starting: (): Resources => ({
      septims: 10,
      wood: 5,
      stone: 5,
      food: 5,
      iron: 0,
    }),
  },

  colors: {
    plains: '#4a7c4f',
    forest: '#2d5a27',
    mountain: '#6b5b4e',
    water: '#2a4a6b',
    snow: '#c8d0d4',
    tundra: '#5a6b4a',
    claimed: '#8ab87a',
    claimedPlayer: '#7acf5a',
    hexBorder: '#1a1a2a',
    hexBorderClaimed: '#3a7a3a',
    settlement: '#d4a050',
    lumberMill: '#8b6f47',
    quarry: '#7a7a7a',
    mine: '#c4a44a',
    farm: '#a0c040',
    barracks: '#c04040',
    watchtower: '#4080c0',
    wall: '#6a6a7a',
    shrine: '#c080e0',
    smithy: '#d07030',
    hpBar: '#40c040',
    hpBarDamage: '#c04040',
    fog: '#0a0a14',
    gridLine: 'rgba(255,255,255,0.06)',
  },

  buildingSlots: {
    min: 1,
    max: 5,
    mainHex: 5,
  },

  tileRegenPerTick: 0.1,

  terrainChance: {
    plains: 0.35,
    forest: 0.25,
    mountain: 0.15,
    water: 0.10,
    snow: 0.05,
    tundra: 0.10,
  },
};

export const TICK_TIME = CONFIG.tickIntervalMs / 1000;
