import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ScoreBand } from '../../api/types';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { getScoreColor } from '../../utils/formatters';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreGaugeProps {
  score: number;
  scoreBand?: ScoreBand;
  size?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  scoreBand,
  size = 170,
}) => {
  const { t } = useTranslation();
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  const targetOffset = circumference - (normalizedScore / 100) * circumference;
  const scoreColor = getScoreColor(score);

  const [displayScore, setDisplayScore] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.6)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedProgress.setValue(0);
    badgeScale.setValue(0.6);
    badgeOpacity.setValue(0);

    const listenerId = animatedProgress.addListener(({ value }) => {
      setDisplayScore(Math.round(value * normalizedScore));
    });

    Animated.sequence([
      Animated.timing(animatedProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    return () => {
      animatedProgress.removeListener(listenerId);
    };
  }, [score, targetOffset, normalizedScore]);

  const animatedOffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, targetOffset],
  });

  const getBandKey = (): string => {
    if (scoreBand) return scoreBand;
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 55) return 'FAIR';
    return 'NEEDS_ATTENTION';
  };

  const bandLabel = t(`scoreBands.${getBandKey()}`);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated dynamic score progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={animatedOffset as any}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Center Readout with animated score roll-up and elastic badge */}
      <View style={styles.content}>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>
          {displayScore}
        </Text>
        <Text style={styles.scoreMax}>/ 100</Text>
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: `${scoreColor}25`,
              transform: [{ scale: badgeScale }],
              opacity: badgeOpacity,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: scoreColor }]}>
            {bandLabel}
          </Text>
        </Animated.View>
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
  content: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontFamily: fonts.display,
    fontSize: 46,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreMax: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: -2,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

