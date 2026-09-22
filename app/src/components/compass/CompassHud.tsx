import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { CompassDirection } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { DIRECTION_INFO_MAP } from '../../utils/compass.util';

interface CompassHudProps {
  heading: number;
  direction: CompassDirection;
  size?: number;
}

export const CompassHud: React.FC<CompassHudProps> = ({
  heading,
  direction,
  size = 180,
}) => {
  const { t } = useTranslation();
  const center = size / 2;
  const radius = size / 2 - 12;
  const dirInfo = DIRECTION_INFO_MAP[direction];

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background glass disk */}
      <View style={[styles.glassBackdrop, { width: size, height: size, borderRadius: size / 2 }]} />

      {/* SVG Compass dial rotating inversely with heading */}
      <Svg width={size} height={size}>
        {/* Outer subtle gold ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.gold}
          strokeWidth="2"
          strokeOpacity="0.4"
          fill="none"
        />

        {/* Inner radar ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 20}
          stroke="#475569"
          strokeWidth="1"
          strokeDasharray="4, 4"
          fill="none"
        />

        {/* Cardinal tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const angleRad = ((deg - heading - 90) * Math.PI) / 180;
          const x1 = center + (radius - 8) * Math.cos(angleRad);
          const y1 = center + (radius - 8) * Math.sin(angleRad);
          const x2 = center + radius * Math.cos(angleRad);
          const y2 = center + radius * Math.sin(angleRad);
          const isCardinal = deg % 90 === 0;

          return (
            <Line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isCardinal ? colors.gold : '#94A3B8'}
              strokeWidth={isCardinal ? '2.5' : '1.5'}
            />
          );
        })}

        {/* Dynamic North Arrow Indicator */}
        {(() => {
          const northAngleRad = ((-heading - 90) * Math.PI) / 180;
          const nx = center + (radius - 28) * Math.cos(northAngleRad);
          const ny = center + (radius - 28) * Math.sin(northAngleRad);
          return (
            <SvgText
              x={nx}
              y={ny + 5}
              fill={colors.gold}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              N
            </SvgText>
          );
        })()}
      </Svg>

      {/* Center Readout Badge */}
      <View style={styles.centerBadge}>
        <Text style={styles.headingText}>{Math.round(heading)}°</Text>
        <Text style={styles.directionText}>{t(`directions.${direction}`)}</Text>
        <Text style={styles.deityText}>{t(`directionElements.${direction}`)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glassBackdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  centerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingText: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  directionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 1,
  },
  deityText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
});
