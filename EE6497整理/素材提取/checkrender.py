import pathlib,pypdfium2 as p
root=pathlib.Path(r'G:\AAADocument\NTU\6497'); out=pathlib.Path(r'G:\AAADocument\test\EE6497整理\素材提取')
for week,filename,pages in [(2,'2_Bayesian_Inference.pdf',[35]),(3,'3_Mixture_Models_and_EM.pdf',[14,37]),(4,'4_Markov_Models_and_HMM.pdf',[27,44,47])]:
 d=p.PdfDocument(str(root/f'week{week}'/filename))
 for n in pages:d[n-1].render(scale=1.6).to_pil().save(out/f'check_w{week}_p{n}.png')
