// Raster/config and representative masks, not physical-device/native build QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { variants, assetSvg } = require('./generate-brand-assets.cjs');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
const image = name => path.join(root, 'assets/images', name);
const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">${body}</svg>`);
const label = (x,y,text,color='#18221D') => `<text x="${x}" y="${y}" fill="${color}" font-size="20" font-family="sans-serif">${text}</text>`;
async function test() {
  for (const v of variants) {
    const file = image(v.name);
    const meta = await sharp(file).metadata();
    assert.equal(meta.width,v.size);assert.equal(meta.height,v.size);assert.equal(meta.format,'png');assert.equal(meta.space,'srgb');
    const {data,info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.channels,4);
    if(v.background) {
      assert.equal(meta.hasAlpha,false,'launcher/store icons must be opaque RGB');
      for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);
    } else {
      assert(meta.hasAlpha);assert.equal(data[3],0,'transparent outer margin');
      let painted=0;
      for(let y=0;y<v.size;y++)for(let x=0;x<v.size;x++) {
        const i=(y*v.size+x)*4;if(!data[i+3])continue;painted++;
        if(v.scale)assert(Math.hypot(x+0.5-512,y+0.5-512)<=1024*33/108,'foreground fits central safe circle');
        if(v.mono)assert.equal(data[i],data[i+1]);
      }
      assert(painted>10000,'nonempty mark');
    }
    const expected = sharp(Buffer.from(assetSvg(v)));if(v.background)expected.removeAlpha();
    assert.deepEqual(await sharp(file).raw().toBuffer(),await expected.raw().toBuffer(),'committed PNG matches SVG master');
  }
  assert.equal(config.icon,'./assets/images/ezprawko-icon.png');
  assert.equal(config.ios.icon.light,config.icon);assert.equal(config.ios.icon.dark,'./assets/images/ezprawko-icon-dark.png');
  assert.equal(config.android.adaptiveIcon.backgroundColor,'#143D2C');assert(!config.android.adaptiveIcon.backgroundImage,'no stale template background override');
  assert.equal(config.android.adaptiveIcon.foregroundImage,'./assets/images/ezprawko-adaptive-icon.png');
  assert.equal(config.android.adaptiveIcon.monochromeImage,'./assets/images/ezprawko-monochrome.png');
  const splash=config.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-splash-screen')[1];
  assert.equal(splash.imageWidth,200);assert.equal(splash.resizeMode,'contain');
  assert.equal(splash.image,'./assets/images/ezprawko-splash-light.png');assert.equal(splash.dark.image,'./assets/images/ezprawko-splash-dark.png');
  const theme=fs.readFileSync(path.join(root,'src/constants/theme.ts'),'utf8');
  assert(theme.includes(`background: '${splash.backgroundColor}'`));assert(theme.includes(`background: '${splash.dark.backgroundColor}'`));
  for(const p of [config.icon,config.ios.icon.dark,config.android.adaptiveIcon.foregroundImage,config.android.adaptiveIcon.monochromeImage,config.web.favicon,splash.image,splash.dark.image])assert(fs.existsSync(path.join(root,p)));
  const preview=path.join(root,'.expo/branding-preview');fs.mkdirSync(preview,{recursive:true});
  const layers=[];
  layers.push({input:svg(`<rect width="1200" height="900" fill="#F7F8F5"/><rect x="600" y="320" width="600" height="580" fill="#111613"/>${label(32,36,'EZprawko | launcher and splash preview')}${label(32,300,'iOS light')}${label(272,300,'iOS dark')}${label(512,300,'Android circle')}${label(752,300,'Android squircle')}${label(992,300,'Themed icon')}${label(32,370,'System light splash')}${label(632,370,'System dark splash','#F0F4F1')}`),top:0,left:0});
  for(const [index,name] of ['ezprawko-icon.png','ezprawko-icon-dark.png','ezprawko-adaptive-icon.png','ezprawko-adaptive-icon.png','ezprawko-monochrome.png'].entries()) {
    const adaptive=index>=2;
    let raster=sharp(image(name));
    // Android's visible 72dp viewport sits inside the 108dp full layer.
    if(adaptive)raster=raster.extract({left:170,top:170,width:684,height:684});
    let input=await raster.resize(200,200).toBuffer();
    if(adaptive)input=await sharp({create:{width:200,height:200,channels:4,background:index===4?'#1F704C':'#143D2C'}}).composite([{input}]).png().toBuffer();
    const mask=index===2||index===4?'<circle cx="100" cy="100" r="99" fill="white"/>':'<rect width="200" height="200" rx="48" fill="white"/>';
    input=await sharp(input).composite([{input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">${mask}</svg>`),blend:'dest-in'}]).png().toBuffer();
    layers.push({input,top:64,left:32+index*240});
  }
  for(const [index,name] of ['ezprawko-splash-light.png','ezprawko-splash-dark.png'].entries())layers.push({input:await sharp(image(name)).resize(200,200).toBuffer(),left:200+index*600,top:510});
  await sharp({create:{width:1200,height:900,channels:4,background:'#F7F8F5'}}).composite(layers).png().toFile(path.join(preview,'brand-board.png'));
  console.log('Branding: 7 deterministic PNGs, 1024px RGB launcher icons, transparent splash/foreground, Android safe circle, mono silhouette, config/theme references and mask preview passed.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});
