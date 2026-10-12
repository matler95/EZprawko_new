// Deterministic SVG -> PNG build artifacts, not runtime code. Sharp is already
// provided by Expo's image toolchain; no additional app dependency is needed.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/branding/ezprawko-mark.svg'), 'utf8');
const body = source.match(/<g[\s\S]*<\/g>/)[0];
const variants = [
  { name: 'ezprawko-icon.png', size: 1024, background: '#143D2C' },
  { name: 'ezprawko-icon-dark.png', size: 1024, background: '#111613', road: '#111613' },
  { name: 'ezprawko-adaptive-icon.png', size: 1024, scale: 0.76 },
  { name: 'ezprawko-monochrome.png', size: 1024, scale: 0.76, mono: true },
  { name: 'ezprawko-splash-light.png', size: 1024, edge: '#1F704C', road: '#F7F8F5', stripe: '#765B1B' },
  { name: 'ezprawko-splash-dark.png', size: 1024, road: '#111613' },
  { name: 'ezprawko-favicon.png', size: 64, background: '#143D2C' },
];
function assetSvg(v) {
  let firstPath = true;
  const silhouette = body.replace(/<path[^>]*\/>/g, (p) => {
    if (!firstPath) return '';
    firstPath = false;
    return p.replace('#82D6A6', '#FFFFFF');
  });
  let mark = v.mono
    ? silhouette
    : body.replaceAll('#82D6A6', v.edge ?? '#82D6A6').replaceAll('#143D2C', v.road ?? '#143D2C').replaceAll('#F0C96A', v.stripe ?? '#F0C96A');
  if (v.scale) mark = `<g transform="translate(512 512) scale(${v.scale}) translate(-512 -512)">${mark}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${v.size}" height="${v.size}" viewBox="0 0 1024 1024">${v.background ? `<rect width="1024" height="1024" fill="${v.background}"/>` : ''}${mark}</svg>`;
}
async function generate() {
  for (const variant of variants) {
    const image = sharp(Buffer.from(assetSvg(variant))).png();
    if (variant.background) image.removeAlpha();
    await image.toFile(path.join(root, 'assets/images', variant.name));
  }
  console.log(`Generated ${variants.length} EZprawko assets from the editable SVG master.`);
}
if (require.main === module) generate().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { variants, assetSvg };
