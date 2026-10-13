const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/constants/theme.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const themeModule = { exports: {} };
new Function('exports', 'require', compiled)(themeModule.exports, (name) => {
  if (name === 'react-native') return { Platform: { select: (values) => values.default } };
  if (name === '@/global.css') return {};
  throw new Error(`Unexpected theme dependency: ${name}`);
});

function luminance(hex) {
  const [red, green, blue] = hex.slice(1).match(/../g).map((value) => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

const pairs = [
  ['textPrimary', 'background'], ['textPrimary', 'surface'],
  ['textSecondary', 'surface'], ['textSecondary', 'primarySurface'],
  ['primaryText', 'primarySurface'], ['onPrimary', 'primary'],
  ['onPrimary', 'dangerSolid'], ['onGold', 'accentGold'],
  ['warning', 'warningSurface'], ['error', 'errorSurface'],
  ['success', 'successSurface'], ['brandMuted', 'brandSurface'],
  ['textPrimary', 'disabledSurface'], ['textSecondary', 'background'],
  ['error', 'background'], ['success', 'background'], ['warning', 'background'],
];
for (const [mode, colors] of Object.entries(themeModule.exports.Colors)) {
  for (const [foreground, background] of pairs) {
    const a = luminance(colors[foreground]);
    const b = luminance(colors[background]);
    const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    assert(contrast >= 4.5, `${mode}: ${foreground}/${background} contrast ${contrast.toFixed(2)} is below 4.5`);
  }
}
console.log(`Theme contrast: ${pairs.length * 2} foreground/background pairs passed (minimum 4.5:1).`);
