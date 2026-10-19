from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
import json
r=Path(r'G:\AAADocument\test\EE6497整理\HW1讲解\LaTeX答案');p=r/'HW1_Answers.pdf'
d=pdfium.PdfDocument(str(p))
for i in range(len(d)):d[i].render(scale=1.5).to_pil().save(r/'build'/f'page{i+1}.png')
rd=PdfReader(p);text='\n'.join(x.extract_text() or '' for x in rd.pages)
(r/'build'/'pdf_text.txt').write_text(text,encoding='utf-8')
assert len(rd.pages)==4, len(rd.pages)
assert 'Question 1' in text and 'Question 2' in text and 'Question 3' in text
assert 'supremum' in text and 'Baum' in text
log=(r/'HW1_Answers.log').read_text(encoding='utf-8',errors='replace')
issues=[l for l in log.splitlines() if 'Overfull' in l or l.startswith('!')]
print(json.dumps({'pages':len(rd.pages),'layout_errors':issues,'bytes':p.stat().st_size}))
