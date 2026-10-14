const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..'),delivery=require('../assets/data/media-delivery.json');
const code=ts.transpileModule(fs.readFileSync(path.join(root,'src/config/media.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function mapping(manifest,version){const exports={};new Function('exports','require','process',code)(exports,name=>{
  if(name==='@/assets/data/media-delivery.json')return manifest;
  if(name==='@/domain/media-version')return {mediaDeliveryVersion:version};throw Error(name);
},{env:{EXPO_PUBLIC_MEDIA_BASE_URL:'https://fixture.invalid/media',EXPO_PUBLIC_SUPABASE_URL:'https://auth.invalid'}});return exports;}
const original=mapping(delivery,'local');
assert.notEqual(original.mediaCacheName('A b.jpg'),original.mediaCacheName('A_b.jpg'));
assert.equal(original.mediaCacheName('one.wmv'),original.mediaCacheName('wideo/one.mp4'));
for(const key of Object.keys(delivery.sizes)){
  const name=original.mediaCacheName(key);assert(!/[/%\\:]/.test(name),'native file URI must not decode encoded separators/colon');
  assert(Buffer.byteLength(name,'utf8')<240,'leave room for the temporary-download suffix');
  assert.equal(name,name.toLowerCase(),'cache identity remains distinct on case-insensitive filesystems');
}
assert.notEqual(original.mediaCacheName('Photo.JPG'),original.mediaCacheName('photo.jpg'));
assert.notEqual(original.mediaCacheName('a b.jpg'),original.mediaCacheName('a_20_b.jpg'),'escape markers themselves cannot collide');
assert.equal(original.mediaSizeBytes('!RS_Przejazd kolejowy Uwieliny.jpg'),9084331);
assert.equal(original.legacyMediaCacheName('!RS_Przejazd kolejowy Uwieliny.jpg'),'_RS_Przejazd_kolejowy_Uwieliny.jpg');
const key='zdjecia/!RS_Przejazd kolejowy Uwieliny.jpg',variantKey='zdjecia/mobile-v1/!RS_Przejazd kolejowy Uwieliny.jpg';
const candidate={...delivery,deliveryVersion:'mobile-v1',paths:{[key]:variantKey},sizes:{...delivery.sizes,[variantKey]:512704}};
delete candidate.sizes[key];const variant=mapping(candidate,'mobile-v1');
assert.equal(variant.deliveredMediaKey(key),variantKey);assert.equal(variant.mediaSizeBytes(key),512704);
assert.notEqual(original.mediaCacheName(key),variant.mediaCacheName(key));assert.equal(variant.legacyMediaCacheName(key),undefined,'never substitute the old original for a versioned variant');
assert.equal(variant.mediaCacheName(key),variant.mediaCacheName(variantKey));
assert.equal(decodeURIComponent(new URL(variant.mediaUrl(variant.deliveredMediaKey(key))).pathname.slice('/media/'.length)),variantKey);
const stale=mapping(candidate,'wrong-version');assert.equal(stale.mediaSizeBytes(key),undefined);assert.equal(stale.deliveredMediaKey(key),key);
const unpublished=mapping({...candidate,published:false,qualityApproved:false},'mobile-v1');
assert.equal(unpublished.deliveredMediaKey(key),key,'an unapproved pilot cannot activate variant URLs');assert.equal(unpublished.mediaSizeBytes(key),undefined);
console.log('Media variants: canonical full-key/cache coalescing, collision-free identities, version separation, exact grant/URL key, inventory bytes and safe unchanged-original legacy reuse passed. No publication.');
