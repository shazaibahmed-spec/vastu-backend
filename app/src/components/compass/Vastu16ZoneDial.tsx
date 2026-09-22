import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { VASTU_16_ZONES, VastuZone16 } from '../../utils/vastu-16-zones.data';

interface Vastu16ZoneDialProps {
  heading: number; // 0 to 360
  size?: number; // width & height of dial (default 320)
  activeZoneId?: string;
  onZonePress?: (zone: VastuZone16) => void;
  onBrahmasthanPress?: () => void;
}

export const Vastu16ZoneDial: React.FC<Vastu16ZoneDialProps> = ({
  heading,
  size = 320,
  activeZoneId,
  onZonePress,
  onBrahmasthanPress,
}) => {
  const center = size / 2;
  const outerRadius = center - 16;
  const sectorRadius = outerRadius - 14;
  const innerRadius = sectorRadius * 0.44;
  const centerMedallionRadius = innerRadius * 0.65;

  // Generate SVG path for a 22.5-degree wedge from -11.25 deg to +11.25 deg
  const startRad = (-11.25 * Math.PI) / 180;
  const endRad = (11.25 * Math.PI) / 180;

  const x1 = center + sectorRadius * Math.sin(startRad);
  const y1 = center - sectorRadius * Math.cos(startRad);
  const x2 = center + sectorRadius * Math.sin(endRad);
  const y2 = center - sectorRadius * Math.cos(endRad);

  const ix1 = center + innerRadius * Math.sin(startRad);
  const iy1 = center - innerRadius * Math.cos(startRad);
  const ix2 = center + innerRadius * Math.sin(endRad);
  const iy2 = center - innerRadius * Math.cos(endRad);

  // Annular sector path
  const sectorPathD = `
    M ${ix1} ${iy1}
    L ${x1} ${y1}
    A ${sectorRadius} ${sectorRadius} 0 0 1 ${x2} ${y2}
    L ${ix2} ${iy2}
    A ${innerRadius} ${innerRadius} 0 0 0 ${ix1} ${iy1}
    Z
  `;

  // Degree tick marks (every 10 degrees)
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 10) {
    const isCardinal = deg % 90 === 0;
    const isMajor = deg % 45 === 0;
    const rad = (deg * Math.PI) / 180;

    const rOuter = outerRadius;
    const rInner = isCardinal ? outerRadius - 10 : isMajor ? outerRadius - 7 : outerRadius - 4;

    const tx1 = center + rOuter * Math.sin(rad);
    const ty1 = center - rOuter * Math.cos(rad);
    const tx2 = center + rInner * Math.sin(rad);
    const ty2 = center - rInner * Math.cos(rad);

    ticks.push(
      <Line
        key={`tick-${deg}`}
        x1={tx1}
        y1={ty1}
        x2={tx2}
        y2={ty2}
        stroke={isCardinal ? '#D4AF37' : isMajor ? '#94A3B8' : '#334155'}
        strokeWidth={isCardinal ? 2 : 1}
      />,
    );
  }

  const labelDistance = (sectorRadius + innerRadius) / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Outer Background Dial Rim */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="#0B111E"
          stroke="#D4AF37"
          strokeWidth={1.5}
        />

        {/* Outer Calibration Ring */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius - 2}
          fill="none"
          stroke="#1E293B"
          strokeWidth={1}
        />

        {/* Rotating Dial Group: Rotates with heading */}
        <G rotation={-heading} origin={`${center}, ${center}`}>
          {/* Degree Ticks */}
          {ticks}

          {/* 16 Sector Wedges & Radially Aligned Labels */}
          {VASTU_16_ZONES.map((zone) => {
            const isSelected = activeZoneId === zone.id;
            const isCardinal = zone.code.length === 1;
            const isIntercardinal = zone.code.length === 2;

            return (
              <G
                key={`sector-group-${zone.id}`}
                rotation={zone.angleCenter}
                origin={`${center}, ${center}`}
              >
                {/* Sector Wedge */}
                <Path
                  d={sectorPathD}
                  fill={zone.elementColor}
                  fillOpacity={isSelected ? 0.6 : 0.2}
                  stroke={isSelected ? '#FDE047' : 'rgba(212, 175, 55, 0.35)'}
                  strokeWidth={isSelected ? 2.5 : 0.75}
                  onPress={() => onZonePress?.(zone)}
                />

                {/* Radially Aligned Zone Label */}
                <SvgText
                  x={center}
                  y={center - labelDistance + (isCardinal ? 4.5 : 3.5)}
                  fill={isSelected ? '#FFFFFF' : isCardinal ? '#F8FAFC' : '#CBD5E1'}
                  fontSize={isCardinal ? 11.5 : isIntercardinal ? 10 : 9}
                  fontWeight={isSelected || isCardinal ? '800' : '600'}
                  letterSpacing={0.4}
                  textAnchor="middle"
                  onPress={() => onZonePress?.(zone)}
                >
                  {zone.code}
                </SvgText>
              </G>
            );
          })}

          {/* Brahmasthan Disk Base (Rotating under the needle) */}
          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="#0F172A"
            stroke="#D4AF37"
            strokeWidth={1.2}
          />

          {/* True North Pointer Needle (Points toward 0° North on the dial) */}
          <Polygon
            points={`
              ${center},${center - innerRadius + 3}
              ${center - 5},${center - centerMedallionRadius + 4}
              ${center + 5},${center - centerMedallionRadius + 4}
            `}
            fill="#EF4444"
          />

          {/* True South Pointer Needle (Points toward 180° South on the dial) */}
          <Polygon
            points={`
              ${center},${center + innerRadius - 3}
              ${center - 5},${center + centerMedallionRadius - 4}
              ${center + 5},${center + centerMedallionRadius - 4}
            `}
            fill="#475569"
          />
        </G>

        {/* Central Brahmasthan Medallion — STATIONARY & ALWAYS UPRIGHT */}
        <G onPress={onBrahmasthanPress}>
          <Circle
            cx={center}
            cy={center}
            r={centerMedallionRadius}
            fill="#0B111E"
            stroke="#D4AF37"
            strokeWidth={1.5}
          />
          <Circle
            cx={center}
            cy={center}
            r={centerMedallionRadius - 3}
            fill="rgba(212, 175, 55, 0.08)"
            stroke="rgba(212, 175, 55, 0.3)"
            strokeWidth={1}
            strokeDasharray="2,2"
          />

          {/* Stationary Upright Text */}
          <SvgText
            x={center}
            y={center - 3}
            fill="#D4AF37"
            fontSize={7.5}
            fontWeight="800"
            letterSpacing={0.8}
            textAnchor="middle"
          >
            BRAHMA
          </SvgText>
          <SvgText
            x={center}
            y={center + 8}
            fill="#94A3B8"
            fontSize={6.5}
            fontWeight="700"
            letterSpacing={0.6}
            textAnchor="middle"
          >
            STHAN
          </SvgText>
        </G>

        {/* Top Fixed Target Marker (12 o'clock Apex Indicator) */}
        <Polygon
          points={`
            ${center},${marginApex}
            ${center - 8},${marginApex - 12}
            ${center + 8},${marginApex - 12}
          `}
          fill="#D4AF37"
          stroke="#F3E5AB"
          strokeWidth={1}
        />
        <Circle cx={center} cy={marginApex - 15} r={3} fill="#D4AF37" />
      </Svg>
    </View>
  );
};

const marginApex = 18;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

