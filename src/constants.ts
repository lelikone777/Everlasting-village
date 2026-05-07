
export enum BuildingType {
  HOUSE = 'HOUSE',
  LUMBER_MILL = 'LUMBER_MILL',
  QUARRY = 'QUARRY',
  FARM = 'FARM',
  ROAD = 'ROAD'
}

export interface BuildingData {
  type: BuildingType;
  name: string;
  cost: {
    wood: number;
    stone: number;
    gold: number;
  };
  production: {
    wood: number;
    stone: number;
    gold: number;
  };
  description: string;
}

export const BUILDINGS: Record<BuildingType, BuildingData> = {
  [BuildingType.HOUSE]: {
    type: BuildingType.HOUSE,
    name: 'Cozy Cottage',
    cost: { wood: 50, stone: 10, gold: 0 },
    production: { wood: 0, stone: 0, gold: 5 },
    description: 'A place for villagers to live. Generates gold tax over time.'
  },
  [BuildingType.LUMBER_MILL]: {
    type: BuildingType.LUMBER_MILL,
    name: 'Lumber Mill',
    cost: { wood: 20, stone: 5, gold: 10 },
    production: { wood: 5, stone: 0, gold: 0 },
    description: 'Produces wood by harvesting nearby forests.'
  },
  [BuildingType.QUARRY]: {
    type: BuildingType.QUARRY,
    name: 'Stone Quarry',
    cost: { wood: 30, stone: 0, gold: 20 },
    production: { wood: 0, stone: 3, gold: 0 },
    description: 'Deep excavation for stone production.'
  },
  [BuildingType.FARM]: {
    type: BuildingType.FARM,
    name: 'Wheat Farm',
    cost: { wood: 10, stone: 10, gold: 5 },
    production: { wood: 0, stone: 0, gold: 2 },
    description: 'Feeds the village and generates small income.'
  },
  [BuildingType.ROAD]: {
    type: BuildingType.ROAD,
    name: 'Stone Path',
    cost: { wood: 0, stone: 2, gold: 0 },
    production: { wood: 0, stone: 0, gold: 0 },
    description: 'Speeds up villagers when they walk on it.'
  }
};

export const GRID_SIZE = 48;
export const TILE_SIZE = 64;

export enum TerrainType {
  GRASS = 'GRASS',
  WATER = 'WATER',
  DIRT = 'DIRT'
}
