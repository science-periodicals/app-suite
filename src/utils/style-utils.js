import tinycolor from 'tinycolor2';
import { arrayify } from '@scipe/jsonld';

export function getCustomVariables(periodical = {}, theme = 'light') {
  const cssVariables = arrayify(periodical.style).filter(
    variable =>
      variable.value &&
      (variable.name === `--accent-color--${theme}-theme` ||
        variable.name === '--accent-color' ||
        variable.name === '--banner-text-color' ||
        variable.name === '--banner-text-shadow-color' ||
        variable.name === '--journal-badge-color' ||
        variable.name === '--journal-badge-color2')
  );

  const themeVariablesNames = [
    '--card-bg-color',
    '--reader-bg-color',
    '--text-color',
    '--text-color--light',
    '--accent-color',
    '--ruling-color',
    '--ruling-color--minor',
    '--ruling-color--major',
    '--card-shadow-color',
    '--card-shadow'
  ];

  let styles = cssVariables.map(
    variable => `${variable.name}: ${variable.value}`
  );

  if (theme) {
    styles = styles.concat(
      themeVariablesNames.map(
        variable => `${variable}: var(${variable}--${theme}-theme)`
      )
    );
  }

  const accent = cssVariables.find(style => style.name === '--accent-color');
  if (accent) {
    // derived colors from the accent color
    styles = styles.concat(
      Array.from({ length: 10 }, (v, k) => k + 1).map(
        i =>
          `--accent-color-${i}-a: ${tinycolor(accent.value)
            .setAlpha(i / 10)
            .toString()}`
      ),
      `--accent-color--dark: ${tinycolor(accent.value)
        .darken(10)
        .toString()}`,
      `--accent-color--light: ${tinycolor(accent.value)
        .lighten(10)
        .toString()}`,
      `--accent-color--ghost: ${tinycolor(accent.value)
        .setAlpha(0.15)
        .toString()}`
    );
  }

  return styles.join(' !important;\n'); // Note: we add important as the order of the style injection is not guaranteed with react helmet
}
