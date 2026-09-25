import { resolvePdfTheme } from './shared';

describe('resolvePdfTheme', () => {
  it('keeps the default navy/gold theme looking as it always has', () => {
    expect(
      resolvePdfTheme({ primary: '#1f2a44', secondary: '#c9a24b' }),
    ).toEqual({
      primary: '#1f2a44',
      secondary: '#c9a24b',
      onPrimary: '#ffffff',
      onSecondary: '#1f2430',
      secondaryTint: '#f0e5cd',
    });
  });

  it('switches to dark text on a pale primary', () => {
    const theme = resolvePdfTheme({ primary: '#f5f5dc', secondary: '#000080' });

    expect(theme.onPrimary).toBe('#1f2430');
    expect(theme.onSecondary).toBe('#ffffff');
  });
});
