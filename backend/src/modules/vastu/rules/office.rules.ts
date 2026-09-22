import {
  DirectionEnum,
  RemedyTypeEnum,
  RoomTypeEnum,
  SeverityEnum,
  VerdictEnum,
} from '../../../common/constants/index.js';
import { VastuRuleDefinition } from '../types/vastu-rule.interface.js';

export const OFFICE_RULES: ReadonlyArray<VastuRuleDefinition> = [
  {
    code: 'OFF-001-DESK-FACING-NE',
    roomType: RoomTypeEnum.OFFICE,
    category: 'ORIENTATION',
    name: 'Working Desk Facing North or East',
    description:
      'The occupant faces North (wealth/opportunity) or East (intellectual clarity) while working, enhancing productivity and focus.',
    targetObject: 'desk',
    condition: {
      field: 'attributes.facingDirection',
      op: 'IN',
      value: [DirectionEnum.NORTH, DirectionEnum.EAST, DirectionEnum.NORTH_EAST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 15,
    defaultRemedy: 'Excellent cognitive alignment for work and study.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-002-WALL-BACKDROP',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Solid Wall Backdrop Behind Executive Chair',
    description:
      'A solid wall is located directly behind the workstation chair, symbolizing executive backing, career support, and stability.',
    targetObject: 'desk',
    condition: {
      field: 'attributes.hasSolidWallBehind',
      op: 'EQUALS',
      value: true,
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy: 'Strong backing configuration.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-003-WINDOW-BEHIND-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'OBSTRUCTION',
    name: 'Window Directly Behind Work Chair',
    description:
      'A large window sits immediately behind the work chair, creating lack of support and energetic vulnerability in professional ventures.',
    targetObject: 'desk',
    condition: {
      field: 'attributes.windowBehindChair',
      op: 'EQUALS',
      value: true,
    },
    severity: SeverityEnum.MEDIUM,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -10,
    defaultRemedy:
      'Install thick, opaque curtains over the window or reposition desk so a solid wall serves as the backdrop.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-004-DESK-FACING-SOUTH-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'ORIENTATION',
    name: 'Working Desk Facing South',
    description:
      'Facing South during prolonged mental work or study causes restlessness, mental exhaustion, and creative blockages.',
    targetObject: 'desk',
    condition: {
      field: 'attributes.facingDirection',
      op: 'EQUALS',
      value: DirectionEnum.SOUTH,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -15,
    defaultRemedy:
      'Rotate desk so you face North or East while seated.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-005-DESK-SW-COMPLIANT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Workstation in South-West Stability Zone (Executive Placement)',
    description:
      'Work desk placed in the South-West, South, or West stability quadrant. Anchors authoritative decision making, career security, and grounded focus.',
    targetObject: 'desk',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.SOUTH_WEST, DirectionEnum.SOUTH, DirectionEnum.WEST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 15,
    defaultRemedy:
      'Ideal desk quadrant. Maintain solid organization on the tabletop.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-006-DESK-NE-COMPLIANT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Workstation in North or East (Intellectual / Solar Clarity)',
    description:
      'Desk located in the North (wealth/opportunity) or East (intellectual vitality) quadrant. Ideal for research, creative work, and sharp cognitive focus.',
    targetObject: 'desk',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.NORTH, DirectionEnum.EAST, DirectionEnum.NORTH_EAST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 15,
    defaultRemedy:
      'Excellent placement for study and intellectual output. Keep the desk face uncluttered.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-007-DESK-SE-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Workstation in South-East (Agni Stress Defect)',
    description:
      'Desk positioned in the South-East fire zone. Fire energy at work leads to mental burnout, high anxiety, hasty decisions, and workplace disputes.',
    targetObject: 'desk',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.SOUTH_EAST,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -15,
    defaultRemedy:
      'Shift desk towards the South-West or North-East. Place a small green indoor plant or quartz crystal on the desk to cool fire vibrations.',
    remedyType: RemedyTypeEnum.ELEMENTAL,
    isActive: true,
  },
  {
    code: 'OFF-008-DESK-CENTER-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Workstation in Room Center (Brahmasthan Lack of Backing)',
    description:
      'Desk placed in the center of the room with no solid wall backing, inducing feelings of isolation, lack of support, and mental fatigue.',
    targetObject: 'desk',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.CENTER,
    },
    severity: SeverityEnum.HIGH,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -20,
    defaultRemedy:
      'Relocate desk so you sit with a solid wall behind you in the South or West sector.',
    remedyType: RemedyTypeEnum.STRUCTURAL,
    isActive: true,
  },
  {
    code: 'OFF-009-DESK-NW-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Workstation in North-West (Vayu Restlessness Defect)',
    description:
      'Desk located in the North-West air zone. Fast-moving Vayu energy induces restlessness, wandering thoughts, and difficulty sustaining long focus.',
    targetObject: 'desk',
    condition: {
      field: 'zone',
      op: 'EQUALS',
      value: DirectionEnum.NORTH_WEST,
    },
    severity: SeverityEnum.MEDIUM,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -10,
    defaultRemedy:
      'Relocate desk to the South-West for grounded stability. If constrained, place a heavy paperweight or stone figurine on the desk.',
    remedyType: RemedyTypeEnum.ELEMENTAL,
    isActive: true,
  },
  {
    code: 'OFF-010-CHAIR-SW-COMPLIANT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Executive Seating Grounded in South-West',
    description:
      'Work chair positioned in the South or West quadrants, providing solid grounding and authoritative posture.',
    targetObject: 'chair',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.SOUTH_WEST, DirectionEnum.SOUTH, DirectionEnum.WEST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy:
      'Favorable executive seating placement.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-011-BOOKSHELF-SW-COMPLIANT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Heavy Bookshelf / Storage in South-West',
    description:
      'Heavy reference library or document storage situated in the South-West stability sector, grounding professional knowledge.',
    targetObject: 'bookshelf',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.SOUTH_WEST, DirectionEnum.SOUTH, DirectionEnum.WEST],
    },
    severity: SeverityEnum.LOW,
    verdictOnMatch: VerdictEnum.COMPLIANT,
    scoreImpact: 10,
    defaultRemedy:
      'Ideal heavy storage placement.',
    remedyType: RemedyTypeEnum.DECORATIVE,
    isActive: true,
  },
  {
    code: 'OFF-012-BOOKSHELF-NE-DEFECT',
    roomType: RoomTypeEnum.OFFICE,
    category: 'PLACEMENT',
    name: 'Heavy Bookshelf in North-East (Mental Clarity Blockage)',
    description:
      'Bulky, dense book storage situated in the delicate North-East corner, cluttering the mental clarity zone.',
    targetObject: 'bookshelf',
    condition: {
      field: 'zone',
      op: 'IN',
      value: [DirectionEnum.NORTH_EAST, DirectionEnum.NORTH],
    },
    severity: SeverityEnum.MEDIUM,
    verdictOnMatch: VerdictEnum.DEFECT,
    scoreImpact: -10,
    defaultRemedy:
      'Relocate heavy storage towards the South or West wall. Keep books in the North-East limited to light, inspirational reading.',
    remedyType: RemedyTypeEnum.STRUCTURAL,
    isActive: true,
  },
];
