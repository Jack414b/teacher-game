import json,pathlib; from pypdf import PdfReader
src=pathlib.Path(r'G:\AAADocument\NTU\6497'); out=pathlib.Path(r'G:\AAADocument\test\EE6497整理\素材提取')
for w in sorted(src.iterdir()):
 if not w.is_dir(): continue
 for f in w.glob('*.pdf'):
  d=PdfReader(f).pages; pages=[f'=== PDF第{i+1}页 ===\n'+p.extract_text() for i,p in enumerate(d)]
  (out/(w.name+'_'+f.stem+'.txt')).write_text('\n'.join(pages),encoding='utf-8')
  print(w.name,f.name,len(d),'pages',sum(len(p) for p in pages),'chars')
 for f in w.glob('*.json'):
  a=json.loads(f.read_text(encoding='utf-8-sig')); seg=[]; group=[]
  def flush():
   if group:
    t=group[0]['s']//1000; end=group[-1]['e']//1000
    seg.append({'id':len(seg)+1,'start':t,'end':end,'en':' '.join(x['w'] for x in group)})
    group.clear()
  for x in a:
   if group and (x['s']-group[0]['s']>=45000 or x['s']-group[-1]['e']>5000): flush()
   group.append(x)
  flush()
  (out/(w.name+'_segments.json')).write_text(json.dumps(seg,ensure_ascii=False,indent=2),encoding='utf-8')
  def tm(t): return f'{t//3600:02}:{t//60%60:02}:{t%60:02}'
  (out/(w.name+'_字幕.txt')).write_text('\n\n'.join(f"[{s['id']:03}] {tm(s['start'])}-{tm(s['end'])}\n{s['en']}" for s in seg),encoding='utf-8')
  print(w.name,len(a),'words',len(seg),'segments',tm(seg[-1]['end']))

