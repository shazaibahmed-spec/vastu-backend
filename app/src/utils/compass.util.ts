import { CompassDirection } from '../api/types';

export interface DirectionInfo {
  code: CompassDirection;
  label: string;
  element: string;
  deity: string;
  description: string;
  angleCenter: number;
}

export const DIRECTION_INFO_MAP: Record<CompassDirection, DirectionInfo> = {
  NORTH: {
    code: 'NORTH',
    label: 'North',
    element: 'Water / Air',
    deity: 'Kubera (Lord of Wealth)',
    description: 'Brings financial flow, career opportunities, and growth.',
    angleCenter: 0,
  },
  NORTH_EAST: {
    code: 'NORTH_EAST',
    label: 'North-East',
    element: 'Water (Jal)',
    deity: 'Ishanya (Supreme Shiva)',
    description: 'Zone of enlightenment, mental clarity, and divine grace.',
    angleCenter: 45,
  },
  EAST: {
    code: 'EAST',
    label: 'East',
    element: 'Air / Fire (Surya)',
    deity: 'Indra (King of Devas)',
    description: 'Governs physical vitality, social recognition, and beginnings.',
    angleCenter: 90,
  },
  SOUTH_EAST: {
    code: 'SOUTH_EAST',
    label: 'South-East',
    element: 'Fire (Agni)',
    deity: 'Agni (Lord of Fire)',
    description: 'Zone of cash liquidity, digestion, and dynamic willpower.',
    angleCenter: 135,
  },
  SOUTH: {
    code: 'SOUTH',
    label: 'South',
    element: 'Earth / Fire',
    deity: 'Yama (Lord of Dharma)',
    description: 'Governs deep restorative rest, reputation, and relaxation.',
    angleCenter: 180,
  },
  SOUTH_WEST: {
    code: 'SOUTH_WEST',
    label: 'South-West',
    element: 'Earth (Prithvi)',
    deity: 'Nirruthi (The Grounding Force)',
    description: 'Zone of heaviness, relationship harmony, and supreme stability.',
    angleCenter: 225,
  },
  WEST: {
    code: 'WEST',
    label: 'West',
    element: 'Air / Space',
    deity: 'Varuna (Lord of Waters)',
    description: 'Governs commercial profits, professional gains, and prosperity.',
    angleCenter: 270,
  },
  NORTH_WEST: {
    code: 'NORTH_WEST',
    label: 'North-West',
    element: 'Air (Vayu)',
    deity: 'Vayu (Lord of Wind)',
    description: 'Zone of networking, mobility, and supportive connections.',
    angleCenter: 315,
  },
  CENTER: {
    code: 'CENTER',
    label: 'Center (Brahmasthan)',
    element: 'Space (Akasha)',
    deity: 'Brahma (The Creator)',
    description: 'The energetic nucleus of the home. Should remain unburdened.',
    angleCenter: 0,
  },
};

/**
 * Normalizes heading to [0, 360) range.
 */
export function normalizeHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Converts a numeric compass angle (0 - 360) into an 8-direction zone.
 */
export function headingToDirection(degrees: number): CompassDirection {
  const norm = normalizeHeading(degrees);

  if (norm >= 337.5 || norm < 22.5) return 'NORTH';
  if (norm >= 22.5 && norm < 67.5) return 'NORTH_EAST';
  if (norm >= 67.5 && norm < 112.5) return 'EAST';
  if (norm >= 112.5 && norm < 157.5) return 'SOUTH_EAST';
  if (norm >= 157.5 && norm < 202.5) return 'SOUTH';
  if (norm >= 202.5 && norm < 247.5) return 'SOUTH_WEST';
  if (norm >= 247.5 && norm < 292.5) return 'WEST';
  return 'NORTH_WEST';
}
