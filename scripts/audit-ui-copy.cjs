const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),root=path.resolve(__dirname,'..'),out={jsx:new Set(),templates:new Set(),strings:new Set()};
function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(p.endsWith('.tsx')){
 const tree=ts.createSourceFile(p,fs.readFileSync(p,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){
 if(ts.isJsxText(n)){const text=n.text.replace(/\s+/g,' ').trim();if(/[A-Za-ząćęłńóśźż]/.test(text))out.jsx.add(text);}
 if(ts.isTemplateExpression(n)){const text=n.head.text+n.templateSpans.map((s,i)=>`{${i}}`+s.literal.text).join('');if(/[ąćęłńóśźż]/.test(text))out.templates.add(text);}
 if(ts.isStringLiteral(n)&&/[ąćęłńóśźż]/.test(n.text)&&!ts.isCallExpression(n.parent))out.strings.add(n.text);
 ts.forEachChild(n,visit);
 }visit(tree);
}}}walk(path.join(root,'src/app'));walk(path.join(root,'src/components'));console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,[...v]])),null,2));
