export interface VastuZone16 {
  id: string;
  code: string;
  sanskritName: string;
  cardinalName: string;
  degreeStart: number;
  degreeEnd: number;
  angleCenter: number;
  element: 'Water' | 'Air' | 'Fire' | 'Earth' | 'Space';
  elementColor: string;
  deity: string;
  attributes: string;
  bestFor: string;
  avoid: string;
  remedyTip: string;
}

export const VASTU_16_ZONES: VastuZone16[] = [
  {
    id: 'N',
    code: 'N',
    sanskritName: 'Uttara',
    cardinalName: 'North',
    degreeStart: 348.75,
    degreeEnd: 11.25,
    angleCenter: 0,
    element: 'Water',
    elementColor: '#0EA5E9', // Sky Blue
    deity: 'Kuber (Lord of Wealth)',
    attributes: 'New Opportunities, Liquid Wealth, Career Growth',
    bestFor: 'Home Office, Cash Safe, Entrance, Living Area, Blue/Green hues',
    avoid: 'Toilets, Heavy Wardrobes, Kitchen/Fire, Red/Pink shades',
    remedyTip: 'Place a lush green plant or a cascading water fountain in this zone to stimulate client inquiries and prosperity.',
  },
  {
    id: 'NNE',
    code: 'NNE',
    sanskritName: 'Uttara-Ishanya',
    cardinalName: 'North-North-East',
    degreeStart: 11.25,
    degreeEnd: 33.75,
    angleCenter: 22.5,
    element: 'Water',
    elementColor: '#38BDF8',
    deity: 'Dhanvantari (Celestial Healer)',
    attributes: 'Health, Vitality, Healing & Cellular Immunity',
    bestFor: 'Medicine cabinet, Meditation corner, Clean Drinking Water, Doctor consults',
    avoid: 'Dustbins, Dirty laundry, Heavy storage, Dark cramped corners',
    remedyTip: 'Keep daily medicines here facing North to enhance recovery and body resistance.',
  },
  {
    id: 'NE',
    code: 'NE',
    sanskritName: 'Ishanya',
    cardinalName: 'North-East',
    degreeStart: 33.75,
    degreeEnd: 56.25,
    angleCenter: 45,
    element: 'Water',
    elementColor: '#06B6D4', // Cyan
    deity: 'Ishanya (Supreme Divine Consciousness)',
    attributes: 'Wisdom, Mental Clarity, Spiritual Grace & Intuition',
    bestFor: 'Pooja/Mandir, Meditation, Yoga, Clean Water Bowl, Light Study',
    avoid: 'Toilets, Overhead Water Tanks, Kitchen/Burner, Clutter',
    remedyTip: 'Keep this corner exceptionally light and spotless; place a crystal or copper water vessel for pure positive vibrations.',
  },
  {
    id: 'ENE',
    code: 'ENE',
    sanskritName: 'Purva-Ishanya',
    cardinalName: 'East-North-East',
    degreeStart: 56.25,
    degreeEnd: 78.75,
    angleCenter: 67.5,
    element: 'Air',
    elementColor: '#10B981', // Emerald Green
    deity: 'Jayanta / Indra Companion',
    attributes: 'Fun, Refreshment, Recreation & Happiness',
    bestFor: 'Family lounge, Entertainment space, Musical instruments, Garden view',
    avoid: 'Heavy junk, Toilets, Dark gloomy paint',
    remedyTip: 'Hang joyous family photos or a floral painting here to uplift household morale.',
  },
  {
    id: 'E',
    code: 'E',
    sanskritName: 'Purva',
    cardinalName: 'East',
    degreeStart: 78.75,
    degreeEnd: 101.25,
    angleCenter: 90,
    element: 'Air',
    elementColor: '#059669',
    deity: 'Surya / Indra (King of Gods)',
    attributes: 'Social Connections, Influence, Networking & Public Recognition',
    bestFor: 'Main Entrance, Living Room seating, Wide windows for morning sun',
    avoid: 'High solid boundary walls that block morning sunlight, Septic tanks',
    remedyTip: 'Allow ample morning sunlight to enter; a brass sun medallion can energize social ties.',
  },
  {
    id: 'ESE',
    code: 'ESE',
    sanskritName: 'Purva-Agneya',
    cardinalName: 'East-South-East',
    degreeStart: 101.25,
    degreeEnd: 123.75,
    angleCenter: 112.5,
    element: 'Air',
    elementColor: '#34D399',
    deity: 'Samudra Manthan (Cosmic Churning)',
    attributes: 'Analysis, Deeper Thinking, Decision Making & Churning',
    bestFor: 'Library, Research desk, Brainstorming nook, Washing machine',
    avoid: 'Master Bedroom bed headboard (causes overthinking and anxiety)',
    remedyTip: 'If sleeping here causes overthinking, reorient bed towards South or place a brass deer figurine.',
  },
  {
    id: 'SE',
    code: 'SE',
    sanskritName: 'Agneya',
    cardinalName: 'South-East',
    degreeStart: 123.75,
    degreeEnd: 146.25,
    angleCenter: 135,
    element: 'Fire',
    elementColor: '#EF4444', // Red / Fire
    deity: 'Agni (Lord of Fire)',
    attributes: 'Cash Liquidity, Zeal, Passion & Digestive Health',
    bestFor: 'Kitchen cooktop/stove, Inverters/Electrical mains, Red accents',
    avoid: 'Underground water tanks, Blue/Black colors, Mirrors facing burner',
    remedyTip: 'Ensure cooking is done facing East. If water/sink is too close to burner, place a green marble divider.',
  },
  {
    id: 'SSE',
    code: 'SSE',
    sanskritName: 'Dakshina-Agneya',
    cardinalName: 'South-South-East',
    degreeStart: 146.25,
    degreeEnd: 168.75,
    angleCenter: 157.5,
    element: 'Fire',
    elementColor: '#F97316', // Orange
    deity: 'Shakti (Primordial Strength)',
    attributes: 'Physical Stamina, Confidence & Inner Drive',
    bestFor: 'Gym, Exercise space, Martial arts practice, Protein storage',
    avoid: 'Toilets, Dim lethargic lighting, Stagnant water',
    remedyTip: 'A warm amber lamp or brass sculpture here dispels lethargy and fuels determination.',
  },
  {
    id: 'S',
    code: 'S',
    sanskritName: 'Dakshina',
    cardinalName: 'South',
    degreeStart: 168.75,
    degreeEnd: 191.25,
    angleCenter: 180,
    element: 'Fire',
    elementColor: '#EA580C',
    deity: 'Yama (Lord of Dharma & Justice)',
    attributes: 'Fame, Relaxation, Restful Sleep & Social Standing',
    bestFor: 'Bedroom (head towards South), Heavy furniture, High thick walls',
    avoid: 'Large open glass entrances on low ground without shade, Underground sump',
    remedyTip: 'Sleep with head strictly towards South for deep cellular rejuvenation and blood pressure stabilization.',
  },
  {
    id: 'SSW',
    code: 'SSW',
    sanskritName: 'Dakshina-Nairutya',
    cardinalName: 'South-South-West',
    degreeStart: 191.25,
    degreeEnd: 213.75,
    angleCenter: 202.5,
    element: 'Earth',
    elementColor: '#EAB308', // Ochre Yellow
    deity: 'Visarjanam (Goddess of Disposal)',
    attributes: 'Disposal, Letting Go, Waste Management & Elimination',
    bestFor: 'Toilet, Drainage outlets, Composting, Scrap closet',
    avoid: 'Pooja room, Cash locker, Study desk (drains knowledge & finances)',
    remedyTip: 'Ideal zone for waste. If important documents are kept here, relocate them immediately to West or North.',
  },
  {
    id: 'SW',
    code: 'SW',
    sanskritName: 'Nairutya',
    cardinalName: 'South-West',
    degreeStart: 213.75,
    degreeEnd: 236.25,
    angleCenter: 225,
    element: 'Earth',
    elementColor: '#D4AF37', // Gold / Heavy Earth
    deity: 'Nirruthi (The Grounding Anchor)',
    attributes: 'Supreme Stability, Relationship Harmony, Career Mastery',
    bestFor: 'Master Bedroom, Head of Family bed, Heavy wardrobes, Brass/Stone anchors',
    avoid: 'Toilets, Open borewells, Large windows, Cut-out balconies',
    remedyTip: 'Ensure this is the heaviest and tallest section of the house. Add heavy earth accents or brass elements to secure family harmony.',
  },
  {
    id: 'WSW',
    code: 'WSW',
    sanskritName: 'Pashchima-Nairutya',
    cardinalName: 'West-South-West',
    degreeStart: 236.25,
    degreeEnd: 258.75,
    angleCenter: 246.25,
    element: 'Earth',
    elementColor: '#F59E0B',
    deity: 'Vidya & Dhana (Wisdom & Savings)',
    attributes: 'Education, Deep Study, Skill Acquisition & Long-Term Savings',
    bestFor: 'Children study desk, Bookshelves, Safe deposit box, Musical practice',
    avoid: 'Toilets (destroys exam retention), Kitchen burner',
    remedyTip: 'Place study desk here facing East or North; keep books organized in yellow or wooden shelves.',
  },
  {
    id: 'W',
    code: 'W',
    sanskritName: 'Pashchima',
    cardinalName: 'West',
    degreeStart: 258.75,
    degreeEnd: 281.25,
    angleCenter: 270,
    element: 'Space',
    elementColor: '#6366F1', // Indigo / Slate
    deity: 'Varuna (Lord of Waters & Cosmic Law)',
    attributes: 'Profits, Financial Gains, Fulfillment of Desires',
    bestFor: 'Dining room, Conference table, Sales team, Investment portfolio',
    avoid: 'Main entrance without threshold, Clutter that blocks gains',
    remedyTip: 'Placing a white or metallic round clock on the West wall activates tangible commercial returns.',
  },
  {
    id: 'WNW',
    code: 'WNW',
    sanskritName: 'Pashchima-Vayavya',
    cardinalName: 'West-North-West',
    degreeStart: 281.25,
    degreeEnd: 303.75,
    angleCenter: 292.5,
    element: 'Space',
    elementColor: '#8B5CF6', // Purple
    deity: 'Rodana (Emotional Catharsis)',
    attributes: 'Detoxification, Emotional Release, Unwinding',
    bestFor: 'Guest bathroom, Reclining chair for venting/unwinding, Laundry',
    avoid: 'Bed headboard (causes long-term melancholy or low mood)',
    remedyTip: 'Use for unwinding and release. Avoid long sleeping durations here; introduce white or off-white decor.',
  },
  {
    id: 'NW',
    code: 'NW',
    sanskritName: 'Vayavya',
    cardinalName: 'North-West',
    degreeStart: 303.75,
    degreeEnd: 326.25,
    angleCenter: 315,
    element: 'Air',
    elementColor: '#A855F7',
    deity: 'Vayu (Lord of Wind)',
    attributes: 'Helpful Friends, Banking Support, Government Approvals, Mobility',
    bestFor: 'Guest bedroom, Bank relationship docs, Finished goods for sale, Granary',
    avoid: 'Heavy master bedroom, Underground sump',
    remedyTip: 'Keep goods ready for shipment or sales contracts here for swift movement and funding approval.',
  },
  {
    id: 'NNW',
    code: 'NNW',
    sanskritName: 'Uttara-Vayavya',
    cardinalName: 'North-North-West',
    degreeStart: 326.25,
    degreeEnd: 348.75,
    angleCenter: 337.5,
    element: 'Water',
    elementColor: '#38BDF8',
    deity: 'Rati & Kamadeva',
    attributes: 'Attraction, Marital Intimacy, Magnetism & Charm',
    bestFor: 'Newlywed bedroom, Dressing area with mirrors, Fragrance display',
    avoid: 'Toilets, Broken items, Harsh dim lighting',
    remedyTip: 'Light aromatic candles or essential oils here to restore tenderness and warmth in marital relationships.',
  },
];

export const BRAHMASTHAN_DATA = {
  id: 'CENTER',
  code: 'CENTER',
  sanskritName: 'Brahmasthan',
  cardinalName: 'Cosmic Center',
  element: 'Space' as const,
  elementColor: '#D4AF37',
  deity: 'Lord Brahma (The Universal Creator)',
  attributes: 'Cosmic Nucleus, Prana Distribution, Zero Weight Void',
  bestFor: 'Open courtyard, Skylight, Light circulation, Zero heavy beams',
  avoid: 'Toilets, Staircases, Heavy pillars, Storage, Kitchen burner',
  remedyTip: 'Must remain unburdened, spotless, and breathable. It is the spiritual solar plexus (Nabhi) of the dwelling.',
};

/**
 * Normalizes any degree to [0, 360)
 */
export function normalizeCompassAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Returns the exact 16-zone metadata for any heading angle (0.0 to 360.0).
 */
export function get16ZoneByHeading(degrees: number): VastuZone16 {
  const norm = normalizeCompassAngle(degrees);

  for (const zone of VASTU_16_ZONES) {
    if (zone.degreeStart > zone.degreeEnd) {
      // Wraps around 360 (North: 348.75 -> 11.25)
      if (norm >= zone.degreeStart || norm < zone.degreeEnd) {
        return zone;
      }
    } else {
      if (norm >= zone.degreeStart && norm < zone.degreeEnd) {
        return zone;
      }
    }
  }

  // Fallback to North
  return VASTU_16_ZONES[0];
}
