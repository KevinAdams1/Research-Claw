import { describe, it, expect } from 'vitest';
import { darkTheme, lightTheme, getThemeTokens, getAntdThemeConfig } from '../styles/theme';
import type { ThemeTokens } from '../styles/theme';

describe('Theme tokens', () => {
  it('dark background is #030303 (pure black, no blue tint)', () => {
    expect(darkTheme.bg.primary).toBe('#030303');
  });

  it('light background is #FFFBF5 (warm paper)', () => {
    expect(lightTheme.bg.primary).toBe('#FFFBF5');
  });

  it('dark borders use rgba', () => {
    expect(darkTheme.border.default).toMatch(/^rgba\(/);
    expect(darkTheme.border.hover).toMatch(/^rgba\(/);
  });

  it('light borders use rgba', () => {
    expect(lightTheme.border.default).toMatch(/^rgba\(/);
    expect(lightTheme.border.hover).toMatch(/^rgba\(/);
  });

  it('dark accent colors are correct', () => {
    expect(darkTheme.accent.red).toBe('#EF4444');
    expect(darkTheme.accent.blue).toBe('#3B82F6');
    expect(darkTheme.accent.green).toBe('#10B981');
    expect(darkTheme.accent.amber).toBe('#F59E0B');
    expect(darkTheme.accent.error).toBe('#F43F5E');
  });

  it('light accent colors are correct', () => {
    expect(lightTheme.accent.red).toBe('#DC2626');
    expect(lightTheme.accent.blue).toBe('#2563EB');
    expect(lightTheme.accent.green).toBe('#059669');
    expect(lightTheme.accent.amber).toBe('#D97706');
    expect(lightTheme.accent.error).toBe('#E11D48');
  });

  it('both themes have effects', () => {
    expect(darkTheme.effects.glowRed).toBeTruthy();
    expect(darkTheme.effects.glassBg).toBeTruthy();
    expect(darkTheme.effects.glassBlur).toBeTruthy();
    expect(lightTheme.effects.glowRed).toBeTruthy();
    expect(lightTheme.effects.glassBg).toBeTruthy();
    expect(lightTheme.effects.glassBlur).toBeTruthy();
  });

  it('getThemeTokens returns correct theme', () => {
    const dark: ThemeTokens = getThemeTokens('dark');
    expect(dark.bg.primary).toBe('#030303');

    const light: ThemeTokens = getThemeTokens('light');
    expect(light.bg.primary).toBe('#FFFBF5');
  });
});

describe('Antd theme config', () => {
  it('dark mode uses darkAlgorithm', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.algorithm).toBeTruthy();
  });

  it('border radius = 8', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.token?.borderRadius).toBe(8);
  });

  it('borderRadiusLG = 12', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.token?.borderRadiusLG).toBe(12);
  });

  it('fontFamily starts with Inter', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.token?.fontFamily).toMatch(/^'Inter'/);
  });

  it('fontFamilyCode starts with Fira Code', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.token?.fontFamilyCode).toMatch(/^'Fira Code'/);
  });

  it('colorError is set', () => {
    const config = getAntdThemeConfig('dark');
    expect(config.token?.colorError).toBe('#F43F5E');
  });
});
