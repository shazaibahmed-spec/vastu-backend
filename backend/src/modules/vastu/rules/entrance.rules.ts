import {
  DirectionEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';
import { VastuRuleDefinition } from '../types/vastu-rule.interface.js';

export const ENTRANCE_RULES: ReadonlyArray<VastuRuleDefinition> = [
  {
    code: 'ENT-001-DOOR-AUSPICIOUS',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Door in Auspicious Solar Zone',
    description:
      'The primary entrance threshold opens in the North, East, or North-East, welcoming auspicious cosmic prana and positive solar energy.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.NORTH, DirectionEnum.EAST, DirectionEnum.NORTH_EAST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 15,
    defaultRemedy:
      'Maintain bright, warm illumination and clean threshold.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-002-DOOR-SW-DEFECT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Door in South-West (Nairutya Defect)',
    description:
      'Main entry situated in the heavy South-West quadrant. Can cause instability in household finances and decision making.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.SOUTH_WEST,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -20,
    defaultRemedy:
      'Install lead metal tape strips or yellow jaisalmer marble threshold tiles, and place brass pyramids flanking the entrance.',
    remedyType: RemedyTypeEnum.ELEMENTAL,
    isActive: true,
  },
  {
    code: 'ENT-003-MIRROR-FACING-DOOR',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'OBSTRUCTION',
    name: 'Mirror Directly Reflecting Main Entrance Door',
    description:
      'A mirror is positioned directly opposite the entry threshold, reflecting incoming positive opportunities back outdoors.',
    targetObject: 'mirror',
    condition: {
      field: 'attributes.reflectsEntranceDoor',
      op: 'EQUALS',
      value: true,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -15,
    defaultRemedy:
      'Relocate the mirror to a perpendicular wall (East or North) so it does not face the doorway directly.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-004-OBSTRUCTION-DOOR',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'OBSTRUCTION',
    name: 'Entryway Threshold Obstructed',
    description:
      'Shoe rack, bulky storage, or clutter obstructs the direct swing and approach of the main door.',
    targetObject: 'shoe_rack',
    condition: {
      field: 'attributes.obstructsEntrance',
      op: 'EQUALS',
      value: true,
    },
    severity: SeverityEnum.MEDIUM,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -10,
    defaultRemedy:
      'Shift shoe storage to the side wall away from direct doorway path and keep threshold spotless.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-005-DOOR-SOUTH-DEFECT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Entrance Facing South (Yama Direction Defect)',
    description:
      'Main entrance situated in the South quadrant. Can create energetic depletion, legal hurdles, and excessive domestic strain according to classical Vastu.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.SOUTH,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -20,
    defaultRemedy:
      'Install a copper Swastik above the door frame, use a vermilion red or coral band along the threshold, and ensure bright warm lighting.',
    remedyType: RemedyTypeEnum.ELEMENTAL,
    isActive: true,
  },
  {
    code: 'ENT-006-DOOR-SE-DEFECT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Entrance in South-East (Agneya Fire Conflict)',
    description:
      'Main entryway opening in the South-East fire quadrant. Cosmic fire at the threshold can cause temper flare-ups, domestic friction, and financial volatility.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.SOUTH_EAST,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -20,
    defaultRemedy:
      'Mount a copper pyramid plate or coral crystals near the door frame to ground excessive Agni vibrations.',
    remedyType: RemedyTypeEnum.ELEMENTAL,
    isActive: true,
  },
  {
    code: 'ENT-007-DOOR-WEST-COMPLIANT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Entrance in West (Varuna Gateway)',
    description:
      'Entrance placed in the West quadrant, governed by Lord Varuna. Favorable for business persons and professionals, welcoming steady material prosperity.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.WEST,
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy:
      'Adorn the doorway with auspicious symbols and maintain bright threshold illumination in the evening.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-008-DOOR-NW-COMPLIANT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Main Entrance in North-West (Vayu Movement Gateway)',
    description:
      'Entrance situated in the North-West air zone. Conducive to social networking, trade movement, and dynamic hospitality.',
    targetObject: 'entrance_door',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.NORTH_WEST,
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy:
      'Place brass bells or melodious wind chimes near the threshold and maintain clean, obstruction-free doorway clearance.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-009-SHOE-RACK-NE-DEFECT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Shoe Storage in North-East (Sacred Zone Impurity)',
    description:
      'Footwear storage or shoe rack placed in the sacred North-East (Ishanya) entrance corner. Heavy or dusty footwear blocks subtle cosmic prana.',
    targetObject: 'shoe_rack',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.NORTH_EAST,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -15,
    defaultRemedy:
      'Relocate shoe storage towards the South, South-West, or North-West side wall. Keep the North-East threshold completely clear and spotless.',
    remedyType: RemedyTypeEnum.STRUCTURAL,
    isActive: true,
  },
  {
    code: 'ENT-010-SHOE-RACK-SW-COMPLIANT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Shoe Rack Grounded in Auxiliary / Vayu Sector',
    description:
      'Shoe rack positioned neatly against the South-West, South, West, or North-West side wall, keeping footwear away from the direct threshold path.',
    targetObject: 'shoe_rack',
    condition: {
      op: 'AND',
      conditions: [
        {
          field: 'zone',
          op: 'IN',
          value: [DirectionEnum.SOUTH_WEST, DirectionEnum.SOUTH, DirectionEnum.WEST, DirectionEnum.NORTH_WEST],
        },
        {
          field: 'attributes.obstructsEntrance',
          op: 'NOT_EQUALS',
          value: true,
        },
      ],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 5,
    defaultRemedy:
      'Keep footwear stored inside closed cabinets and maintain a fresh, fragrant entrance.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-011-MIRROR-EAST-COMPLIANT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Foyer Mirror in North or East (Prana Reflection)',
    description:
      'Mirror mounted along the North or East wall of the entrance foyer, doubling light and expanding auspicious cosmic flow.',
    targetObject: 'mirror',
    condition: {
      op: 'AND',
      conditions: [
        {
          field: 'zone',
          op: 'IN',
          value: [DirectionEnum.NORTH, DirectionEnum.EAST, DirectionEnum.NORTH_EAST],
        },
        {
          field: 'attributes.reflectsEntranceDoor',
          op: 'NOT_EQUALS',
          value: true,
        },
      ],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy:
      'Favorable mirror position. Ensure it does not directly reflect the exterior opening.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'ENT-012-MIRROR-SW-DEFECT',
    roomType: RoomTypeEnum.MAIN_ENTRANCE,
    category: 'PLACEMENT',
    name: 'Mirror in South or South-West Entrance Zone',
    description:
      'Mirror situated along the South or South-West wall of the entrance. Reflecting the heavy stability zone disrupts grounding prana.',
    targetObject: 'mirror',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.SOUTH, DirectionEnum.SOUTH_WEST],
    },
    severity: SeverityEnum.MEDIUM,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -10,
    defaultRemedy:
      'Relocate mirror to an East or North wall, or veil it with an elegant cover when not in active use.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
];
