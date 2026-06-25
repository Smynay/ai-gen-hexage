import { EnemyType } from '../types';

export type EnemyDef = {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  armor: number;
  reward: { septims: number };
  description: string;
};

export const ENEMIES: Record<EnemyType, EnemyDef> = {
  [EnemyType.Draugr]: {
    type: EnemyType.Draugr,
    name: 'Драугр',
    hp: 8,
    speed: 0.3,
    damage: 1,
    attackInterval: 2,
    armor: 1,
    reward: { septims: 2 },
    description: 'Медленный нежить-воин.',
  },
  [EnemyType.Bandit]: {
    type: EnemyType.Bandit,
    name: 'Бандит',
    hp: 5,
    speed: 0.5,
    damage: 1,
    attackInterval: 1.5,
    armor: 0,
    reward: { septims: 3 },
    description: 'Быстрый, но слабый.',
  },
  [EnemyType.BanditMarauder]: {
    type: EnemyType.BanditMarauder,
    name: 'Бандит-налётчик',
    hp: 7,
    speed: 0.4,
    damage: 2,
    attackInterval: 1.5,
    armor: 0,
    reward: { septims: 4 },
    description: 'Вооружённый бандит.',
  },
  [EnemyType.Forsworn]: {
    type: EnemyType.Forsworn,
    name: 'Изгой',
    hp: 6,
    speed: 0.6,
    damage: 2,
    attackInterval: 1.2,
    armor: 0,
    reward: { septims: 4 },
    description: 'Дикий воин Изгоев.',
  },
  [EnemyType.ForswornBriarheart]: {
    type: EnemyType.ForswornBriarheart,
    name: 'Изгой-Сердце-Терна',
    hp: 12,
    speed: 0.5,
    damage: 4,
    attackInterval: 1.5,
    armor: 1,
    reward: { septims: 7 },
    description: 'Элитный воин Изгоев.',
  },
  [EnemyType.Falmer]: {
    type: EnemyType.Falmer,
    name: 'Фалмер',
    hp: 8,
    speed: 0.5,
    damage: 3,
    attackInterval: 1.0,
    armor: 0,
    reward: { septims: 5 },
    description: 'Слепой, но быстрый.',
  },
  [EnemyType.FalmerShadowmaster]: {
    type: EnemyType.FalmerShadowmaster,
    name: 'Фалмер-Тенемрак',
    hp: 10,
    speed: 0.7,
    damage: 4,
    attackInterval: 0.8,
    armor: 1,
    reward: { septims: 7 },
    description: 'Элитный фалмер-убийца.',
  },
  [EnemyType.DragonPriest]: {
    type: EnemyType.DragonPriest,
    name: 'Драконий жрец',
    hp: 25,
    speed: 0.3,
    damage: 6,
    attackInterval: 2.5,
    armor: 3,
    reward: { septims: 20 },
    description: 'Могущественный маг.',
  },
  [EnemyType.Dragon]: {
    type: EnemyType.Dragon,
    name: 'Дракон',
    hp: 50,
    speed: 0.8,
    damage: 10,
    attackInterval: 2.0,
    armor: 5,
    reward: { septims: 50 },
    description: 'Ужас небес!',
  },
};
