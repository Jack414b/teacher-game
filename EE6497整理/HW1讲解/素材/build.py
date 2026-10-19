from pathlib import Path
import re,html,shutil,json
from urllib.parse import quote
R=Path(r'G:\AAADocument\test\EE6497整理\HW1讲解');S=R/'素材'
shutil.copy2(Path(r'G:\AAADocument\NTU\6497\HW1.pdf'),R/'HW1.pdf')
md=(R/'HW1_从高中基础到逐题推导.md').read_text(encoding='utf-8-sig')
E=html.escape
class Tex:
 def __init__(self,s):self.s=re.sub(r'\\frac(\d)(\d)',r'\\frac{\1}{\2}',s);self.i=0
 def skip(self):
  while self.i<len(self.s) and self.s[self.i].isspace():self.i+=1
 def rawgroup(self):
  self.skip()
  if self.i>=len(self.s):return ''
  if self.s[self.i]!='{':v=self.s[self.i];self.i+=1;return v
  self.i+=1;start=self.i;dep=1
  while self.i<len(self.s):
   c=self.s[self.i];self.i+=1
   if c=='{':dep+=1
   elif c=='}':
    dep-=1
    if dep==0:return self.s[start:self.i-1]
  raise ValueError('Unbalanced TeX '+self.s)
 def group(self):
  self.skip()
  if self.i<len(self.s) and self.s[self.i]=='{':
   self.i+=1;v=self.row('}');self.i+=1;return '<mrow>'+v+'</mrow>'
  return self.atom()
 def atom(self):
  self.skip()
  if self.i>=len(self.s):return '<mrow/>'
  c=self.s[self.i];self.i+=1
  if c=='{':v=self.row('}');self.i+=1;return '<mrow>'+v+'</mrow>'
  if c=='\\':
   m=re.match(r'[A-Za-z]+',self.s[self.i:])
   if not m:
    if self.i<len(self.s):self.i+=1
    return '<mspace width="0.2em"/>'
   cmd=m[0];self.i+=len(cmd)
   if cmd=='frac':return '<mfrac>'+self.group()+self.group()+'</mfrac>'
   if cmd in ('hat','bar'):return '<mover accent="true">'+self.group()+'<mo>'+('^' if cmd=='hat' else '¯')+'</mo></mover>'
   if cmd in ('text','operatorname'):return '<mtext>'+E(self.rawgroup())+'</mtext>'
   if cmd in ('left','right'):return self.atom()
   if cmd in ('quad','qquad'):return '<mspace width="'+('1em' if cmd=='quad' else '2em')+'"/>'
   syms={'theta':'θ','lambda':'λ','pi':'π','xi':'ξ','gamma':'γ','ell':'ℓ','Delta':'Δ','infty':'∞','sum':'∑','prod':'∏','int':'∫','times':'×','cdot':'·','cdots':'⋯','ldots':'…','ge':'≥','le':'≤','ne':'≠','to':'→','in':'∈','mid':'|','approx':'≈'}
   if cmd in ('log','ln'):return '<mi mathvariant="normal">'+cmd+'</mi>'
   if cmd not in syms:raise ValueError('Unknown TeX command '+cmd+' in '+self.s)
   tag='mi' if cmd in ('theta','lambda','pi','xi','gamma','ell','Delta') else 'mo'
   return '<'+tag+'>'+syms[cmd]+'</'+tag+'>'
  if c.isdigit():
   m=re.match(r'[\d.]*',self.s[self.i:]);v=c+m[0];self.i+=len(m[0]);return '<mn>'+v+'</mn>'
  if c.isalpha():return '<mi>'+E(c)+'</mi>'
  return '<mo>'+E(c)+'</mo>'
 def row(self,stop=None):
  out=[]
  while self.i<len(self.s):
   self.skip()
   if self.i>=len(self.s) or self.s[self.i]==stop:break
   base=self.atom();sub=sup=None;self.skip()
   while self.i<len(self.s) and self.s[self.i] in '_^':
    op=self.s[self.i];self.i+=1;value=self.group()
    if op=='_':sub=value
    else:sup=value
    self.skip()
   if sub is not None and sup is not None:base='<msubsup>'+base+sub+sup+'</msubsup>'
   elif sub is not None:base='<msub>'+base+sub+'</msub>'
   elif sup is not None:base='<msup>'+base+sup+'</msup>'
   out.append(base)
  return ''.join(out)
def math(s,display=False):return '<math xmlns="http://www.w3.org/1998/Math/MathML"'+(' display="block"' if display else '')+' aria-label="'+E(s,quote=True)+'"><mrow>'+Tex(s).row()+'</mrow></math>'
def inline(s):
 stash=[]
 def keep(v):stash.append(v);return f'@@TOKEN{len(stash)-1}@@'
 s=re.sub(r'\$([^$]+)\$',lambda m:keep(math(m[1])),s)
 s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:keep('<a href="'+E(quote(m[2],safe='/#:.%'),quote=True)+'">'+E(m[1])+'</a>'),s)
 s=E(s);s=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',s)
 for i,v in enumerate(stash):s=s.replace(f'@@TOKEN{i}@@',v)
 return s
lines=md.splitlines();out=[];toc=[];i=0;section=0
while i<len(lines):
 s=lines[i]
 if not s.strip():i+=1;continue
 if s.startswith('$$'):
  assert s.endswith('$$');out.append('<div class="equation">'+math(s[2:-2],True)+'</div>');i+=1;continue
 m=re.match(r'^(#{1,3}) (.*)',s)
 if m:
  level=len(m[1]);att=''
  if level==2:
   section+=1;sid=f'section-{section}';toc.append((sid,m[2]));att=f' id="{sid}"'
  out.append(f'<h{level}{att}>'+inline(m[2])+f'</h{level}>');i+=1;continue
 if s.startswith('|') and i+1<len(lines) and re.match(r'^\|[\s:|\-]+$',lines[i+1]):
  headers=[x.strip() for x in s.strip('|').split('|')];i+=2;rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   cells=[x.strip() for x in lines[i].strip('|').split('|')];rows.append('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in cells)+'</tr>');i+=1
  out.append('<div class="table-scroll"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in headers)+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table></div>');continue
 if re.match(r'^(?:- |\d+\. )',s):
  ordered=bool(re.match(r'^\d+\.',s));tag='ol' if ordered else 'ul';pattern=r'^\d+\. ' if ordered else r'^- ';items=[]
  while i<len(lines) and re.match(pattern,lines[i]):items.append('<li>'+inline(re.sub(pattern,'',lines[i]))+'</li>');i+=1
  out.append('<'+tag+'>'+''.join(items)+'</'+tag+'>');continue
 parts=[s];i+=1
 while i<len(lines) and lines[i].strip() and not re.match(r'^(?:#|\||\$\$|- |\d+\. )',lines[i]):parts.append(lines[i]);i+=1
 out.append('<p>'+inline(' '.join(parts))+'</p>')
body=''.join(out)
# Insert interactions directly after the relevant explanation, before the next section.
# Section indices: 1 foundations,2 Q1a,3 Q1b,4 Q1c,5 Q2intro,6 Q2ai,7 Q2aii,8 Q2bi,9 Q2bii,10 Q2c,11 Q3intro,12 Q3a,13 Q3b,14 summary,15 checks.
hmm='''<section class="lab" id="hmm-lab"><div class="lab-heading"><span>动手试一试</span><h3>同一条输出，四条隐藏路线</h3></div><p>固定看到“o₂ → o₁”。拖动参数，观察各条路线的概率与总似然。p、q是输出概率；a、b是留在原状态的概率。</p><div class="sliders">'''
for key,val,label in [('p',.8,'状态s₁输出o₁的概率 p'),('q',.2,'状态s₂输出o₁的概率 q'),('a',.7,'s₁留在s₁的概率 a'),('b',.6,'s₂留在s₂的概率 b')]:
 hmm+=f'<label for="h-{key}">{label}<output id="h-{key}-value"></output><input type="range" id="h-{key}" min="0" max="1" step="0.01" value="{val}"></label>'
hmm+='''</div><div class="route-bars" id="route-bars"></div><div class="lab-result"><strong id="h-total"></strong><p id="h-explain"></p></div><button id="h-opt">把a、b调到本题的MLE</button><button class="secondary" id="h-reset">恢复示例数字</button><p class="small">条形长度是联合概率（统一以1为满格）。每条路线的“联合概率 ÷ 总似然”是给定输出后的路线后验概率；它是理解EM软计数的一步。</p></section>'''
q3='''<section class="lab" id="life-lab"><div class="lab-heading"><span>动手试一试</span><h3>寿命记录怎样变成“继续／结束”的次数？</h3></div><p>固定r=3，输入记录为1、2、3、4的设备数。最后一类是4，它不额外贡献结束次数。</p><div class="counts">'''
for k,v in enumerate([2,1,1,2],1):q3+=f'<label for="n{k}">n{k}：记录为{k}<input id="n{k}" type="number" min="0" max="100" step="1" value="{v}"></label>'
q3+='''</div><div class="lab-result"><strong id="life-result"></strong><p id="life-counts"></p></div><svg id="life-plot" viewBox="0 0 640 240" role="img" aria-label="设备数据对应的似然曲线"></svg><button id="life-normal">恢复六台设备的例子</button><button class="secondary" id="life-first">全在第一轮结束</button><button class="secondary" id="life-last">全都进入最后一类</button><p class="small">横轴是θ，纵轴是按最大值或上确界缩放后的似然，最高显示为1。θ=0不属于题目参数范围，若最优只能逼近0，会显示空心点。</p></section>'''
body=body.replace('<h2 id="section-10">',hmm+'<h2 id="section-10">').replace('<h2 id="section-14">',q3+'<h2 id="section-14">')
css='''
:root{--ink:#20372f;--muted:#67776d;--accent:#147c61;--line:#dce5dc;--bg:#f6f7f1}*{box-sizing:border-box}html{scroll-padding-top:90px;scroll-behavior:smooth}body{margin:0;font:17px/1.9 "Microsoft YaHei","Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}header{position:sticky;top:0;z-index:4;background:#173e32;color:white;display:flex;align-items:center;justify-content:space-between;padding:15px 28px;gap:20px}header b{font-size:20px}header span{font-size:12px;color:#cce2d3}header a{color:#d2e7d7;font-size:13px;margin-left:18px}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);max-width:1450px;margin:auto}aside{padding:28px 18px;position:sticky;top:74px;height:calc(100vh - 75px);overflow:auto;font-size:13px}aside p{font-size:12px;color:var(--muted)}aside a{display:block;margin:9px 0;padding:5px 8px;border-left:2px solid #dbe4d8;line-height:1.55;color:#52695b}main{min-width:0;padding:30px 36px 90px}.paper{background:white;border:1px solid var(--line);border-radius:12px;padding:34px 42px}h1{font-size:30px;line-height:1.5;margin:0 0 22px}h2{font-size:25px;line-height:1.6;margin:50px 0 24px;padding-top:25px;border-top:2px solid #dce7d8;scroll-margin-top:90px}h3{font-size:20px;line-height:1.6;margin:28px 0 14px}p{margin:15px 0;overflow-wrap:anywhere}strong{color:#164d38}.equation{padding:14px 18px;background:#f7f9f3;border:1px solid #e6ecdf;border-radius:7px;margin:18px 0;overflow-x:auto}math{font-family:"Cambria Math","STIX Two Math",serif;font-size:1.1em}math[display=block]{margin:0.25em 0;min-width:max-content}mtext{font-family:"Microsoft YaHei",sans-serif;font-size:.82em}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.8}th,td{border:1px solid var(--line);text-align:left;padding:12px 13px;min-width:70px}th{background:#edf3e9}tr:nth-child(even){background:#fbfcf8}.table-scroll{overflow-x:auto;margin:20px 0}td math{white-space:nowrap}li{margin:9px 0}.lab{background:#eff5e8;border:1px solid #cddcbd;border-radius:12px;padding:25px;margin:36px 0}.lab-heading span{font-size:12px;letter-spacing:2px;color:var(--accent)}.lab h3{margin:4px 0 14px;font-size:22px}.lab p{font-size:14px}.sliders{display:grid;grid-template-columns:1fr 1fr;gap:16px 25px}.sliders label{font-size:13px}.sliders output{float:right;font-weight:bold;color:var(--accent)}input[type=range]{display:block;width:100%;accent-color:var(--accent)}button,input{font:inherit}button{background:var(--accent);color:white;border:0;border-radius:6px;padding:10px 13px;margin:7px 8px 5px 0;cursor:pointer;font-size:13px}.secondary{background:white;color:var(--accent);border:1px solid #c6d6bf}.route{display:grid;grid-template-columns:80px 1fr 110px;align-items:center;gap:10px;font-size:13px;margin:12px 0}.track{height:16px;background:#dae4cf;border-radius:4px}.bar{height:16px;background:#2c8870;border-radius:4px;min-width:0}.lab-result{background:white;border-radius:8px;padding:13px 16px;margin:18px 0}.lab-result strong{font-size:19px}.lab-result p{margin:5px 0}.small{font-size:12px!important;color:var(--muted)}.counts{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.counts label{font-size:12px}.counts input{width:100%;padding:8px;border:1px solid #bed0b4;border-radius:5px;background:white;font-size:16px}#life-plot{width:100%;background:white;border-radius:8px}#life-plot text{font-family:"Microsoft YaHei",sans-serif;font-size:12px;fill:#526558}:target{outline:2px solid #d9b666;outline-offset:6px}.lead-tag{color:var(--muted);font-size:12px;letter-spacing:2px;margin-bottom:12px}@media(max-width:1050px){.layout{grid-template-columns:210px 1fr}main{padding:24px 20px}.paper{padding:28px 25px}}@media(max-width:700px){header{position:static;padding:13px 18px;flex-wrap:wrap;gap:4px}header a{margin:0 14px 0 0}.layout{display:block}aside{position:static;height:auto;padding:15px 18px}aside nav{display:flex;overflow-x:auto;gap:8px}aside a{flex:0 0 155px;margin:0;font-size:12px}aside p{margin:3px 0 10px}main{padding:5px 12px 60px}.paper{padding:23px 17px}body{font-size:16px}h1{font-size:25px}h2{font-size:22px}h3{font-size:18px}.equation{padding:10px}.sliders{grid-template-columns:1fr}.lab{padding:17px}.counts{grid-template-columns:1fr 1fr}.route{grid-template-columns:65px 1fr 95px;gap:7px;font-size:11px}}@media print{header,aside,.lab{display:none}.layout{display:block}main,.paper{padding:0;border:0}body{font-size:12px;background:white}.equation{break-inside:avoid;background:white}h2,h3{break-after:avoid}.table-scroll{overflow:visible}table{font-size:11px}}
'''
js='''
const fmt=x=>Number(x).toFixed(4);const byId=id=>document.getElementById(id);function hmm(){const v={};for(const k of ['p','q','a','b']){v[k]=Number(byId('h-'+k).value);byId('h-'+k+'-value').textContent=v[k].toFixed(2)}const{p,q,a,b}=v;const vals=[.5*(1-p)*a*p,.5*(1-p)*(1-a)*q,.5*(1-q)*(1-b)*p,.5*(1-q)*b*q];const total=vals.reduce((a,b)=>a+b,0);const names=['s₁ → s₁','s₁ → s₂','s₂ → s₁','s₂ → s₂'];byId('route-bars').innerHTML=vals.map((x,i)=>'<div class="route"><span>'+names[i]+'</span><div class="track"><div class="bar" style="width:'+x*100+'%"></div></div><span>'+fmt(x)+' · '+(total>0?(100*x/total).toFixed(1)+'%':'—')+'</span></div>').join('');byId('h-total').textContent='输出序列的总似然 = '+fmt(total);let advice;if(p===q)advice='p=q：输出无法区分状态，改变a、b不会改变此似然。';else if(p>q)advice=p===1?'p=1>q：最优b=0；a任意，因为第一步不可能处于s₁。':'p>q：a增大使似然上升，b增大使似然下降；最优(a,b)=(1,0)。';else advice=q===1?'q=1>p：最优a=0；b任意，因为第一步不可能处于s₂。':'p<q：a减小使似然上升，b增大使似然上升；最优(a,b)=(0,1)。';byId('h-explain').textContent=advice+' 每行右侧依次显示联合概率和路线后验百分比。'+(total===0?' 当前模型把该输出判为不可能，无法归一化路线后验。':'');return v}
for(const k of ['p','q','a','b'])byId('h-'+k).addEventListener('input',hmm);byId('h-opt').onclick=()=>{const{p,q}=hmm();if(p>q){if(p<1)byId('h-a').value=1;byId('h-b').value=0}else if(p<q){byId('h-a').value=0;if(q<1)byId('h-b').value=1}hmm()};byId('h-reset').onclick=()=>{for(const[k,v]of Object.entries({p:.8,q:.2,a:.7,b:.6}))byId('h-'+k).value=v;hmm()};hmm();
function life(){const ns=[1,2,3,4].map(k=>Math.max(0,Math.min(100,Math.floor(Number(byId('n'+k).value)||0))));const n=ns.reduce((a,b)=>a+b,0),S=ns[1]+2*ns[2]+3*ns[3],F=ns[0]+ns[1]+ns[2];if(n===0){byId('life-result').textContent='先输入至少一台设备';byId('life-counts').textContent='没有数据时，这里不计算MLE。';byId('life-plot').innerHTML='';return}const theta=S/(S+F);byId('life-result').textContent=S===0?'MLE不存在：最优只能逼近被排除的θ=0':'θ的MLE = '+S+'/'+(S+F)+' = '+theta.toFixed(4);byId('life-counts').textContent='设备数 n='+n+'；继续次数 S='+S+'；结束次数 F='+F+'。'+(F===0?'全部在最后一类，允许的θ=1取得最大值。':S===0?'公式形式上给0，但参数范围是0<θ≤1。':'曲线先升后降，最高点是继续次数占总次数的比例。');const logmax=(S?S*Math.log(theta):0)+(F?F*Math.log1p(-theta):0);const val=t=>{if(t===0)return S===0?1:0;if(t===1)return F===0?1:0;return Math.exp((S?S*Math.log(t):0)+(F?F*Math.log1p(-t):0)-logmax)};const points=[];for(let i=0;i<=320;i++){let t=i/320;points.push((45+550*t).toFixed(2)+','+(195-155*val(t)).toFixed(2))}const x=45+550*theta;byId('life-plot').innerHTML='<line x1="45" y1="195" x2="605" y2="195" stroke="#81947c"/><line x1="45" y1="30" x2="45" y2="195" stroke="#81947c"/><text x="15" y="44">1</text><text x="40" y="218">0</text><text x="313" y="218">0.5</text><text x="590" y="218">1</text><text x="615" y="199">θ</text><polyline points="'+points.join(' ')+'" fill="none" stroke="#197c60" stroke-width="3"/><line x1="'+x+'" x2="'+x+'" y1="40" y2="195" stroke="#b79139" stroke-dasharray="5 4"/><circle cx="'+x+'" cy="40" r="6" fill="'+(S===0?'white':'#b79139')+'" stroke="#b79139" stroke-width="2"/>'}
for(let k=1;k<=4;k++)byId('n'+k).addEventListener('input',life);function setcounts(ns){ns.forEach((v,i)=>byId('n'+(i+1)).value=v);life()}byId('life-normal').onclick=()=>setcounts([2,1,1,2]);byId('life-first').onclick=()=>setcounts([6,0,0,0]);byId('life-last').onclick=()=>setcounts([0,0,0,6]);life();
'''
nav=''.join('<a href="#'+sid+'">'+E(t)+'</a>' for sid,t in toc)
page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HW1 · 从高中基础到逐题推导</title><style>'+css+'</style></head><body><header><div><b>EE6497 / HW1</b><br><span>理解题意 → 补齐概念 → 推导 → 自查</span></div><div><a href="HW1.pdf">作业原文 ↗</a><a href="../'+quote('学习导航.html')+'">四周课堂导航 ↗</a><a href="'+quote('HW1_从高中基础到逐题推导.md')+'" download>下载讲解</a></div></header><div class="layout"><aside><p>不跳过关键步骤 · 全部10个小问</p><nav>'+nav+'</nav><p>公式支持离线显示。<br>绿色区域可以调整数字。<br>课堂链接打开对应知识点与字幕。</p></aside><main><article class="paper"><div class="lead-tag">高中数学起点 · 以理解为目标</div>'+body+'</article></main></div><script>'+js+'</script></body></html>'
(R/'HW1_逐题讲解.html').write_text(page,encoding='utf-8')
(S/'结构记录.json').write_text(json.dumps({'sections':toc,'math_blocks':page.count('<math'),'html_chars':len(page),'markdown_chars':len(md)},ensure_ascii=False,indent=2),encoding='utf-8')
print('Sections',len(toc),'Math',page.count('<math'),'HTML bytes',len(page.encode('utf-8')))
