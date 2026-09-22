import { RoomTypeEnum } from '../../../common/constants/index.js';
import {
  VASTU_OBJECTS_BY_ROOM,
  VISION_PROMPT_VERSION,
} from '../../../common/constants/vision.constants.js';

/**
 * Current prompt version — persisted alongside each analysis for auditing.
 */
export { VISION_PROMPT_VERSION };

/**
 * System-level instruction for the vision model.
 * Strictly factual observer — zero Vastu interpretation.
 */
export const VISION_SYSTEM_PROMPT = `
You are an expert architectural computer vision engine specializing in room spatial layout identification.
Your sole job is to identify physical objects, room fixtures, and spatial coordinates from the user's photograph.

CRITICAL INSTRUCTION:
DO NOT provide any Vastu Shastra advice, astrological commentary, or superstitious interpretations.
DO NOT determine whether any object placement is "good" or "bad".
DO NOT suggest remedies, improvements, or recommendations of any kind.
You are strictly an objective computer vision observer reporting visual facts.

Instructions:
1. Determine whether this photograph depicts an actual INDOOR ROOM or architectural interior.
   - Set "isArchitecturalSpace": false if the photograph depicts an outdoor nature scene, an animal, a vehicle, food, a document, a screenshot, or any non-architectural subject.
   - Set "isArchitecturalSpace": true ONLY if the photograph shows an indoor room or architectural interior.

2. Identify all primary furniture and architectural fixtures relevant to this room type.

3. For each detected object, determine:
   - objectType: lowercase snake_case identifier (e.g. "bed", "gas_stove", "mirror", "entrance_door")
   - label: human-readable description (e.g. "King Size Wooden Bed")
   - relativePosition: approximate normalized coordinates where:
     x: 0.0 (left edge of image) to 1.0 (right edge of image)
     y: 0.0 (top edge of image) to 1.0 (bottom edge of image)
   - boundingBox (if determinable): { x, y, width, height } in normalized 0.0–1.0 coordinates
   - confidence: 0.0 to 1.0 indicating how certain you are the object is present
   - zone: using the camera forward bearing, compute the cardinal/ordinal compass zone
   - attributes: object-specific properties (e.g. headboardDirection, reflectsBed, underCeilingBeam, facingDirection, clockwiseOpening, obstructsEntrance)

4. Assess overall image quality:
   - isClear: boolean
   - lighting: "POOR" | "MODERATE" | "GOOD"
   - isBlurry: boolean
   - isArchitecturalSpace: boolean
   - score: 0.0 to 1.0 overall quality estimate
   - usable: boolean (false if image is too dark, blurry, or not a room)
   - issues: string array of any problems (e.g. ["TOO_DARK", "PARTIALLY_OBSTRUCTED"])

5. Classify the room type you observe (independent of user declaration):
   - roomTypeDetected: the room type you actually see
   - roomTypeConfidence: 0.0 to 1.0

6. Return ONLY valid JSON matching the required schema.

Enum values MUST be uppercase:
- zone: "NORTH" | "NORTH_EAST" | "EAST" | "SOUTH_EAST" | "SOUTH" | "SOUTH_WEST" | "WEST" | "NORTH_WEST" | "CENTER"
- roomTypeDetected: "BEDROOM" | "KITCHEN" | "LIVING_ROOM" | "MAIN_ENTRANCE" | "OFFICE"
- lighting: "POOR" | "MODERATE" | "GOOD"

If no objects are detectable, return an empty array [] for detectedObjects.
If you are uncertain about an object, still include it but set confidence below 0.6.
`;

/**
 * Builds the user-facing prompt with room context, camera heading, and per-room object hints.
 */
export function buildVisionUserPrompt(
  roomType: RoomTypeEnum,
  headingDegrees: number | undefined,
  calibratedDirection: string | undefined,
): string {
  const objectHints = VASTU_OBJECTS_BY_ROOM[roomType] || [];
  const objectList = objectHints.map((o) => `"${o}"`).join(', ');

  return `
Analyze this photograph. The user designated this space as: "${roomType}".
Camera Forward Bearing: ${headingDegrees ?? 'Unknown'} degrees (Calibrated Direction: ${calibratedDirection ?? 'Unknown'}).

Instructions:
1. Architectural Verification:
   Determine whether this photograph depicts an actual INDOOR ROOM or architectural interior.
   - Set "isArchitecturalSpace": false if the photograph depicts an outdoor nature scene (such as a waterfall, mountain, forest, sky, river, beach), an animal, a vehicle, food, a document, a screenshot, or any non-architectural subject.
   - Set "isArchitecturalSpace": true ONLY if the photograph shows an indoor room or architectural interior.

2. If isArchitecturalSpace is true, examine the visual evidence and determine the ACTUAL room type shown:
   - "BEDROOM" if a bed, mattress, headboard, nightstand, or wardrobe dominates the space.
   - "KITCHEN" if a cooking stove, burner, kitchen sink, kitchen cabinets, or refrigerator dominates.
   - "LIVING_ROOM" if sofa, couch, coffee table, or television seating dominates.
   - "MAIN_ENTRANCE" if main doorway, foyer, shoe rack, or entryway threshold dominates.
   - "OFFICE" if work desk, study table, computer monitor, or office chair dominates.
   Even if the user designated "${roomType}", if the photo clearly depicts a different room, set "roomTypeDetected" to the actual room type depicted.

3. For this room type, look specifically for these objects: [${objectList}].
   Identify all key fixtures and furniture with their relative coordinates and compass placement zone.
   If this is not an indoor architectural space or no furniture is present, return an empty array [] for detectedObjects.

4. For each detected object, provide:
   - objectType (lowercase snake_case)
   - label (human-readable)
   - zone (compass direction based on camera heading)
   - relativePosition { x: 0.0–1.0, y: 0.0–1.0 }
   - boundingBox { x, y, width, height } in normalized coordinates (if determinable)
   - confidence (0.0–1.0)
   - attributes (object-specific: headboardDirection, reflectsBed, underCeilingBeam, facingDirection, clockwiseOpening, obstructsEntrance, etc.)

5. Assess image quality and overall usability.

6. Provide roomTypeConfidence (0.0–1.0) for your room classification.

Required JSON Structure:
{
  "roomTypeDetected": "BEDROOM" | "KITCHEN" | "LIVING_ROOM" | "MAIN_ENTRANCE" | "OFFICE",
  "roomTypeConfidence": 0.92,
  "detectedObjects": [
    {
      "objectType": "bed",
      "label": "Master Bed",
      "zone": "NORTH",
      "relativePosition": { "x": 0.5, "y": 0.5 },
      "boundingBox": { "x": 0.2, "y": 0.3, "width": 0.6, "height": 0.4 },
      "confidence": 0.9,
      "attributes": { "headboardDirection": "NORTH", "headboardOrientation": "NORTH" }
    }
  ],
  "qualityAssessment": {
    "isClear": true,
    "lighting": "GOOD",
    "isBlurry": false,
    "isArchitecturalSpace": true,
    "score": 0.9,
    "usable": true,
    "issues": []
  },
  "observations": ["Bed placed along North wall"]
}

Return strictly valid JSON conforming to this schema.
`;
}
