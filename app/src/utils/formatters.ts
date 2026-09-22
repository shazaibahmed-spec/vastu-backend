import { RoomType, ScoreBand, Severity, Verdict } from '../api/types';
import { colors } from '../theme/colors';

export function getScoreColor(score: number): string {
  if (score >= 90) return colors.compliant;
  if (score >= 75) return colors.gold;
  if (score >= 55) return colors.warning;
  return colors.defect;
}

export function getScoreBandLabel(band?: ScoreBand, score = 0): string {
  if (band) return band.replace('_', ' ');
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 55) return 'FAIR';
  return 'NEEDS ATTENTION';
}

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'CRITICAL':
      return '#EF4444';
    case 'HIGH':
      return '#F97316';
    case 'MEDIUM':
      return '#F59E0B';
    case 'LOW':
      return '#10B981';
    default:
      return colors.neutral;
  }
}

export function getVerdictBadge(verdict: Verdict) {
  switch (verdict) {
    case 'COMPLIANT':
      return { label: 'Auspicious', color: colors.compliant, bg: 'rgba(16, 185, 129, 0.15)' };
    case 'DEFECT':
      return { label: 'Defect', color: colors.defect, bg: 'rgba(239, 68, 68, 0.15)' };
    case 'NEUTRAL':
      return { label: 'Neutral', color: colors.neutral, bg: 'rgba(107, 114, 128, 0.15)' };
  }
}

export const ROOM_TYPE_META: Record<
  RoomType,
  { label: string; icon: string; subtitle: string; primaryZone: string }
> = {
  BEDROOM: {
    label: 'Master Bedroom',
    icon: 'bed',
    subtitle: 'Bed alignment, head direction, mirrors',
    primaryZone: 'South-West (Nirruthi)',
  },
  KITCHEN: {
    label: 'Kitchen',
    icon: 'utensils',
    subtitle: 'Cooking stove, sink, fire-water balance',
    primaryZone: 'South-East (Agneya)',
  },
  LIVING_ROOM: {
    label: 'Living Room',
    icon: 'sofa',
    subtitle: 'Seating layout, electronics, airflow',
    primaryZone: 'North / East / North-East',
  },
  MAIN_ENTRANCE: {
    label: 'Main Entrance',
    icon: 'door-open',
    subtitle: 'Threshold energy, lighting, obstacles',
    primaryZone: 'North-East / East / North',
  },
  OFFICE: {
    label: 'Office / Study',
    icon: 'briefcase',
    subtitle: 'Desk facing, solid backdrop, focus',
    primaryZone: 'North / East',
  },
};
