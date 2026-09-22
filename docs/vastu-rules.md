# Vastu Rules Engine Specification & Classical Rulebook

## 1. Spatial Geometry & Coordinate Mathematics

Vastu Shastra is fundamentally an ancient Vedic science of directional energies, magnetic flux, solar radiation, and five primordial elements (Pancha Mahabhutas: Earth, Water, Fire, Air, Space).

### 1.1. Directional Degree Bounds (8-Zone Partition)
The 360-degree compass circle is partitioned into 8 primary octants of $45^\circ$ each (centered on cardinal and ordinal axes), plus the geometric center (Brahmasthan):

| Zone Code | Direction | Element | Ruling Deity | Degree Span | Energetic Principle |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NORTH` | North (Uttara) | Water / Mercury | Kubera | `337.5°` to `22.5°` | Wealth, new opportunities, liquidity |
| `NORTH_EAST` | North-East (Ishanya) | Water / Jupiter | Shiva / Ishana | `22.5°` to `67.5°` | Clarity, wisdom, spiritual peace |
| `EAST` | East (Purva) | Air / Sun | Indra / Surya | `67.5°` to `112.5°` | Vitality, social connectivity, health |
| `SOUTH_EAST` | South-East (Agneya) | Fire / Venus | Agni | `112.5°` to `157.5°` | Energy, digestion, cash flow, drive |
| `SOUTH` | South (Dakshina) | Fire / Mars | Yama | `157.5°` to `202.5°` | Fame, rest, legal stability |
| `SOUTH_WEST` | South-West (Nairutya) | Earth / Rahu | Nairuti | `202.5°` to `247.5°` | Grounding, mastery, relationship stability |
| `WEST` | West (Pashchima) | Space / Saturn | Varuna | `247.5°` to `292.5°` | Financial gains, fulfillment, profits |
| `NORTH_WEST` | North-West (Vayavya) | Air / Moon | Vayu | `292.5°` to `337.5°` | Movement, support network, relationships |
| `CENTER` | Brahmasthan | Space (Akasha) | Brahma | Geometric Core | Core energy vortex; must remain unburdened |

---

## 2. Rule Structure & Condition Predicate DSL

To prevent the LLM from inventing rules or hallucinating principles, rules are represented as **deterministic AST predicate schemas**.

### JSON Rule Schema
```typescript
export interface VastuRuleDefinition {
  code: string;                      // Unique ID e.g., 'KIT-001-STOVE-SE'
  roomType: RoomType;
  category: 'ELEMENTAL' | 'PLACEMENT' | 'ORIENTATION' | 'OBSTRUCTION';
  name: string;
  description: string;
  targetObject: string;              // 'gas_stove', 'bed', 'sink', 'mirror', 'desk'
  condition: RuleCondition;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  verdictOnMatch: 'COMPLIANT' | 'DEFECT' | 'NEUTRAL';
  scoreImpact: number;               // Negative for defect, positive/neutral for compliant
  defaultRemedy: string;
  remedyType: 'STRUCTURAL' | 'ELEMENTAL' | 'DECORATIVE' | 'COLOR';
}

export type RuleCondition =
  | { field: string; op: 'EQUALS' | 'NOT_EQUALS'; value: any }
  | { field: string; op: 'IN' | 'NOT_IN'; value: any[] }
  | { field: string; op: 'DISTANCE_LESS_THAN'; targetObject: string; maxMeters: number }
  | { field: string; op: 'ALIGNED_OPPOSITE'; targetObject: string }
  | { op: 'AND'; conditions: RuleCondition[] }
  | { op: 'OR'; conditions: RuleCondition[] };
```

---

## 3. Seeded Classical Rulebook (V1)

### 3.1. Bedroom Rules

#### `BED-001-POS-SW`: Master Bed in South-West
- **Target**: `bed`
- **Condition**: `zone IN ['SOUTH_WEST', 'SOUTH', 'WEST']`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+10`
- **Description**: "Bed positioned in the South-West or South stability zone, anchoring restorative sleep and relationship harmony."

#### `BED-002-POS-NE-DEFECT`: Bed in North-East (Ishanya Defect)
- **Target**: `bed`
- **Condition**: `zone EQUALS 'NORTH_EAST'`
- **Verdict On Match**: `DEFECT`
- **Severity**: `CRITICAL`
- **Score Impact**: `-25`
- **Default Remedy**: "Relocate the bed to the South or South-West wall. If immovable, raise bed on a solid wooden platform and place a brass helix in the corner."

#### `BED-003-HEAD-NORTH-DEFECT`: Sleeping Head Facing North
- **Target**: `bed`
- **Condition**: `attributes.headboardDirection EQUALS 'NORTH'`
- **Verdict On Match**: `DEFECT`
- **Severity**: `CRITICAL`
- **Score Impact**: `-25`
- **Default Remedy**: "Immediately reposition pillow/headboard towards the South or East. North-facing head aligns magnetic poles, causing vascular tension and sleep disturbance."

#### `BED-004-HEAD-SOUTH-COMPLIANT`: Sleeping Head Facing South
- **Target**: `bed`
- **Condition**: `attributes.headboardDirection EQUALS 'SOUTH'`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+10`
- **Description**: "Headboard situated towards the South aligns with Earth's electromagnetic field, delivering deep REM sleep."

#### `BED-005-MIRROR-BED-REFLECTION`: Mirror Directly Reflecting Bed
- **Target**: `mirror`
- **Condition**: `{ op: 'AND', conditions: [{ field: 'attributes.reflectsBed', op: 'EQUALS', value: true }] }`
- **Verdict On Match**: `DEFECT`
- **Severity**: `HIGH`
- **Score Impact**: `-15`
- **Default Remedy**: "Cover mirror with a non-translucent cloth or partition screen during sleep hours."

#### `BED-006-BEAM-OVERHEAD`: Bed Directly Under Ceiling Beam
- **Target**: `bed`
- **Condition**: `attributes.underCeilingBeam EQUALS true`
- **Verdict On Match**: `DEFECT`
- **Severity**: `HIGH`
- **Score Impact**: `-15`
- **Default Remedy**: "Move bed away from overhead beam or install a flat false ceiling to neutralize downward energetic compression."

---

### 3.2. Kitchen Rules

#### `KIT-001-STOVE-SE`: Cooking Stove in South-East (Agni Corner)
- **Target**: `gas_stove`
- **Condition**: `zone EQUALS 'SOUTH_EAST'`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+15`
- **Description**: "Cooking stove situated in the primary Fire quadrant (Agneya), maximizing vitality and prosperity."

#### `KIT-002-STOVE-NE-DEFECT`: Stove in North-East (Fire in Water Zone)
- **Target**: `gas_stove`
- **Condition**: `zone EQUALS 'NORTH_EAST'`
- **Verdict On Match**: `DEFECT`
- **Severity**: `CRITICAL`
- **Score Impact**: `-30`
- **Default Remedy**: "Critical elemental conflict. Shift cooking appliance immediately towards the South-East. If temporary, place a green marble slab beneath the burner."

#### `KIT-003-SINK-NE`: Water Sink in North or North-East
- **Target**: `sink`
- **Condition**: `zone IN ['NORTH_EAST', 'NORTH']`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+10`
- **Description**: "Water drainage and sink located in water-friendly quadrant."

#### `KIT-004-FIRE-WATER-CLASH`: Stove Adjacent to Sink
- **Target**: `gas_stove`
- **Condition**: `{ op: 'DISTANCE_LESS_THAN', targetObject: 'sink', maxMeters: 0.9 }`
- **Verdict On Match**: `DEFECT`
- **Severity**: `HIGH`
- **Score Impact**: `-20`
- **Default Remedy**: "Place a wooden cutting board, live green plant, or ceramic divider between the stove and the water sink to neutralize elemental clash."

---

### 3.3. Main Entrance Rules

#### `ENT-001-DOOR-AUSPICIOUS`: Entrance in North, East, or North-East
- **Target**: `entrance_door`
- **Condition**: `zone IN ['NORTH', 'EAST', 'NORTH_EAST']`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+15`
- **Description**: "Main threshold invites positive solar energy and cosmic prana."

#### `ENT-002-DOOR-SW-DEFECT`: Entrance in South-West
- **Target**: `entrance_door`
- **Condition**: `zone EQUALS 'SOUTH_WEST'`
- **Verdict On Match**: `DEFECT`
- **Severity**: `HIGH`
- **Score Impact**: `-20`
- **Default Remedy**: "Install lead metal strips or yellow marble threshold tiles, and affix two brass pyramids above the door frame."

#### `ENT-003-MIRROR-REFLECTING-DOOR`: Mirror Directly Facing Main Entrance
- **Target**: `mirror`
- **Condition**: `attributes.reflectsEntranceDoor EQUALS true`
- **Verdict On Match**: `DEFECT`
- **Severity**: `HIGH`
- **Score Impact**: `-15`
- **Default Remedy**: "Reposition mirror away from the direct entryway line of sight. Front-facing mirrors bounce incoming positive chi back outside."

---

### 3.4. Living Room Rules

#### `LIV-001-SOFA-SW`: Heavy Seating in South or South-West
- **Target**: `sofa`
- **Condition**: `zone IN ['SOUTH_WEST', 'SOUTH', 'WEST']`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+10`
- **Description**: "Heavy furniture grounded against South/West walls fosters familial stability."

#### `LIV-002-TV-NE-DEFECT`: Television / Heavy Electronics in North-East
- **Target**: `television`
- **Condition**: `zone EQUALS 'NORTH_EAST'`
- **Verdict On Match**: `DEFECT`
- **Severity**: `MEDIUM`
- **Score Impact**: `-10`
- **Default Remedy**: "Move media console to South-East wall. Keep North-East corner uncluttered and open."

---

### 3.5. Office / Study Rules

#### `OFF-001-DESK-FACING-NORTH-EAST`: Working Desk Facing North or East
- **Target**: `desk`
- **Condition**: `attributes.facingDirection IN ['NORTH', 'EAST', 'NORTH_EAST']`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+15`
- **Description**: "Facing North or East while studying or working optimizes cognitive retention and focus."

#### `OFF-002-WALL-BACKDROP`: Solid Wall Behind Chair
- **Target**: `desk`
- **Condition**: `attributes.hasSolidWallBehind EQUALS true`
- **Verdict On Match**: `COMPLIANT`
- **Score Impact**: `+10`
- **Description**: "Solid support behind seating position ensures career backing and executive stability."

---

## 4. Scoring Algorithm & Rating Bands

The scoring engine initializes with a base of 100 points and applies bounded adjustments:

$$\text{FinalScore} = \max\left(0, \min\left(100, 100 - \sum \text{DefectPenalties} + \sum \text{ComplianceBonuses}\right)\right)$$

### Penalty Multipliers by Severity
- `CRITICAL`: $-25$ to $-30$ points
- `HIGH`: $-15$ to $-20$ points
- `MEDIUM`: $-8$ to $-12$ points
- `LOW`: $-4$ to $-6$ points

### Qualitative Score Bands
- **`90 - 100`**: `EXCELLENT` — Space is in harmonious alignment with cosmic energies.
- **`75 - 89`**: `GOOD` — Positive foundation with minor corrective opportunities.
- **`55 - 74`**: `FAIR` — Moderate elemental imbalances requiring non-invasive remedies.
- **`< 55`**: `NEEDS_ATTENTION` — Significant energetic clashes present; prioritize remedial actions.
