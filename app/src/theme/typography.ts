import { TextStyle } from 'react-native';
import { fonts } from './fonts';

export const typography: Record<string, TextStyle> = {
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  h2: {
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '600',
  },
  wisdomQuote: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  overline: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};
