import { Injectable } from '@nestjs/common';
import { SupportedLanguageEnum } from '../../../common/constants/index.js';
import { DailyPrincipleResponseDto } from '../dto/daily-principle-response.dto.js';
import { PRINCIPLE_TRANSLATIONS } from './vastu-wisdom.translations.js';

export const VASTU_PRINCIPLES: Array<
  Omit<DailyPrincipleResponseDto, 'date'>
> = [
  {
    id: 'ne-ishanya-clarity',
    zone: 'North-East (Ishanya)',
    element: 'Water (Jal)',
    quote:
      'The North-East quadrant is governed by the water element and supreme mental clarity. Keep it light, clean, and free from heavy clutter.',
    actionTip:
      'Keep this corner open and clean; place a crystal or clear water bowl to invite positive prana.',
  },
  {
    id: 'se-agneya-fire',
    zone: 'South-East (Agneya)',
    element: 'Fire (Agni)',
    quote:
      'The South-East quadrant governs the primal fire element. It fuels physical digestion, vitality, and steady financial liquidity.',
    actionTip:
      'Ideal location for the kitchen stove or warm lighting; avoid placing mirrors or water features here.',
  },
  {
    id: 'sw-nairutya-stability',
    zone: 'South-West (Nairutya)',
    element: 'Earth (Prithvi)',
    quote:
      'The South-West represents supreme stability and grounding. Anchoring the heaviest furniture here protects family relationships and career mastery.',
    actionTip:
      'Best suited for the master bedroom and heavy wardrobes; avoid keeping this corner light or empty.',
  },
  {
    id: 'nw-vayavya-movement',
    zone: 'North-West (Vayavya)',
    element: 'Air (Vayu)',
    quote:
      'The North-West is governed by the wind element, directing healthy movement, helpful relationships, and swift opportunity turnover.',
    actionTip:
      'Maintain good air circulation; ideal placement for guest bedrooms, finished goods, and communication tools.',
  },
  {
    id: 'brahmasthan-core',
    zone: 'Center (Brahmasthan)',
    element: 'Space (Akasha)',
    quote:
      'The Brahmasthan is the central energetic navel of your living space. It must breathe unhindered to distribute cosmic balance to every room.',
    actionTip:
      'Keep the center of your room or home free of heavy pillars, dark obstructions, or central clutter.',
  },
  {
    id: 'north-kubera-wealth',
    zone: 'North (Kubera)',
    element: 'Water & Abundance',
    quote:
      'The North direction is blessed by Lord Kubera, the custodian of wealth. Keeping it open and welcoming promotes business growth and new career pathways.',
    actionTip:
      'Use subtle green or blue accents here; avoid placing heavy storage bins or toilets along the north axis.',
  },
  {
    id: 'east-surya-vitality',
    zone: 'East (Surya)',
    element: 'Solar Light & Health',
    quote:
      'The East is energized by the morning solar spectrum. Welcoming morning sunlight into eastern windows invigorates mental freshness and bodily health.',
    actionTip:
      'Open eastern blinds at dawn; face East when studying, planning, or engaging in mindful meditation.',
  },
  {
    id: 'bedroom-head-alignment',
    zone: 'Sleep Direction',
    element: 'Magnetic Harmony',
    quote:
      'Sleeping with your head aligned towards the South or East harmonizes with the Earth’s natural geomagnetic currents for deep restorative rest.',
    actionTip:
      'Avoid placing your head towards the North, which induces electromagnetic resistance and restless REM sleep.',
  },
  {
    id: 'mirror-energy-doubling',
    zone: 'Mirror Placement',
    element: 'Water Reflection',
    quote:
      'Mirrors reflect and magnify spatial energy. Placing mirrors on North or East walls draws beneficial positive vibrations deeper into the room.',
    actionTip:
      'Position mirrors so they do not directly reflect your sleeping body from the bed.',
  },
  {
    id: 'entrance-simha-dwara',
    zone: 'Main Threshold',
    element: 'Energy Gateway',
    quote:
      'The main entrance is the mouth of your home through which all cosmic life energy flows. It should always remain well-lit, clean, and welcoming.',
    actionTip:
      'Keep the doorway threshold free of shoe clutter and ensure the door opens smoothly without creaking.',
  },
  {
    id: 'kitchen-fire-water-balance',
    zone: 'Kitchen Layout',
    element: 'Fire vs. Water',
    quote:
      'Fire (the cooking stove) and Water (the sink) represent opposing natural forces that require respectful distance within the kitchen.',
    actionTip:
      'Maintain at least 2 feet between your cooktop and sink, or introduce an earthy wooden dividing element.',
  },
  {
    id: 'indoor-greenery',
    zone: 'Living Area',
    element: 'Wood & Renewal',
    quote:
      'Healthy indoor plants revitalize stagnant corners and purify stale air, cultivating a vibrant aura in the North and East living spaces.',
    actionTip:
      'Choose rounded, broad-leafed plants like Money Plants or Peace Lilies; avoid prickly cactus inside living zones.',
  },
  {
    id: 'home-office-focus',
    zone: 'Work Sanctuary',
    element: 'Mental Acuity',
    quote:
      'Sitting facing North or East while working or negotiating accelerates cognitive clarity, strategic foresight, and financial stability.',
    actionTip:
      'Position your work desk with a solid wall behind you rather than an open door or back-facing window.',
  },
  {
    id: 'evening-lighting-tranquility',
    zone: 'Evening Atmosphere',
    element: 'Warm Illumination',
    quote:
      'As dusk descends, warm golden lighting in the South-East and South quadrants calms active cortisol and invites peaceful domestic tranquility.',
    actionTip:
      'Switch from harsh overhead white lights to warm ambient lamps 1 hour before bedtime.',
  },
];

@Injectable()
export class VastuWisdomService {
  getDailyPrinciple(
    dateStr?: string,
    offset = 0,
    lang?: SupportedLanguageEnum,
  ): DailyPrincipleResponseDto {
    const date = dateStr ? new Date(dateStr) : new Date();
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff =
      date.getTime() -
      startOfYear.getTime() +
      (startOfYear.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const total = VASTU_PRINCIPLES.length;
    const index = Math.abs((dayOfYear + offset) % total);
    const principle = VASTU_PRINCIPLES[index];

    let localized = {};
    if (lang && PRINCIPLE_TRANSLATIONS[principle.id]?.[lang]) {
      localized = PRINCIPLE_TRANSLATIONS[principle.id]![lang]!;
    }

    return {
      ...principle,
      ...localized,
      date: date.toISOString().split('T')[0],
    };
  }

  getAllPrinciples(): DailyPrincipleResponseDto[] {
    const today = new Date().toISOString().split('T')[0];
    return VASTU_PRINCIPLES.map((p) => ({
      ...p,
      date: today,
    }));
  }
}
