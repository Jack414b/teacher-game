import pathlib,pypdfium2 as pdfium
from PIL import Image,ImageDraw
src=pathlib.Path(r'G:\AAADocument\NTU\6497'); out=pathlib.Path(r'G:\AAADocument\test\EE6497整理\素材提取')
for w in sorted(src.iterdir()):
 if not w.is_dir():continue
 f=next(w.glob('Week*.pdf')); d=pdfium.PdfDocument(str(f))
 for start in range(0,len(d),8):
  canvas=Image.new('RGB',(1600,650*((min(8,len(d)-start)+1)//2)),'#ddd'); draw=ImageDraw.Draw(canvas)
  for j in range(start,min(start+8,len(d))):
   im=d[j].render(scale=1.1).to_pil(); im.thumbnail((780,615))
   x=((j-start)%2)*800; y=((j-start)//2)*650
   canvas.paste(im,(x,y+30)); draw.text((x+10,y+8),f'{w.name} Week PDF page {j+1}',fill='black')
  canvas.save(out/f'{w.name}_practice_{start+1}.jpg')
