from pathlib import Path
import json,re,html,shutil,hashlib,zipfile
from urllib.parse import quote,unquote,urlsplit
from html.parser import HTMLParser

ROOT=Path(r'G:\AAADocument\test\EE6497整理')
RAW=ROOT/'素材提取'
SRC=Path(r'G:\AAADocument\NTU\6497')
TITLES={1:'概率建模与贝叶斯基础',2:'MLE、MAP与线性回归',3:'混合模型、EM与K-means',4:'马尔可夫链与HMM'}
COURSES={1:'1_Introduction.pdf',2:'2_Bayesian_Inference.pdf',3:'3_Mixture_Models_and_EM.pdf',4:'4_Markov_Models_and_HMM.pdf'}
COUNTS={1:55,2:36,3:44,4:49}
HANDCOUNTS={1:28,2:9,3:6,4:7}

def hms(v):
    v=int(v);return f'{v//3600:02d}:{v%3600//60:02d}:{v%60:02d}'
def relpdf(w,hand=False):
    return f'原始材料/week{w}/'+(f'Week {w}.pdf' if hand else COURSES[w])
def pdfurl(w,p,hand=False):
    return quote(relpdf(w,hand),safe='/')+f'#page={p}'
def esc(s):return html.escape(str(s),quote=True)

data={}; stats=[]; source_hashes=[]
for w in range(1,5):
    target=ROOT/'原始材料'/f'week{w}';target.mkdir(parents=True,exist_ok=True)
    for f in (SRC/f'week{w}').iterdir():
        if f.is_file():
            shutil.copy2(f,target/f.name)
            digest=hashlib.sha256(f.read_bytes()).hexdigest()
            assert hashlib.sha256((target/f.name).read_bytes()).hexdigest()==digest
            source_hashes.append({'week':w,'file':f.name,'sha256':digest})
    segs=json.loads((RAW/f'week{w}_segments.json').read_text(encoding='utf-8-sig'))
    zh={}
    for line in (RAW/f'week{w}_zh.txt').read_text(encoding='utf-8-sig').splitlines():
        if not line.strip():continue
        n,t=line.split('|',1);n=int(n);assert n not in zh;zh[n]=t
    assert set(zh)=={s['id'] for s in segs}
    original=json.loads(next((SRC/f'week{w}').glob('*.json')).read_text(encoding='utf-8-sig'))
    words=[r['w'] for r in original if r.get('t')=='word']
    expected=' '.join(words)
    actual=' '.join(s['en'] for s in segs)
    assert expected==actual, f'Week{w}: English mismatch'
    path=ROOT/f'第{w}周_知识点.md'
    note=path.read_text(encoding='utf-8-sig').replace('**\\n','**\n')
    if w==2:note=note.replace('代码原页需图像查看','代码原页已作图像核对')
    if w==3:note=note.replace('## 自测\n','## 自测（整理者编写）\n')
    # Keep a stable base for repeatable builds, without generated links.
    note=re.sub(r'^<a id="w\d-k\d+"></a>\n','',note,flags=re.M)
    note=re.sub(r'^定位链接：.*\n\n','',note,flags=re.M)
    refs=[]; kp=0
    for ln in note.splitlines():
        if re.match(r'### \d+\.',ln):
            kp+=1;refs.append({'id':f'w{w}-k{kp}','title':ln[4:],'ranges':[],'pages':[],'hand':[],'line':''})
        if ln.startswith('**出处：') and refs and not refs[-1]['line']:
            ref=refs[-1];ref['line']=ln
            sm=re.search(r'字幕([\d–—、\-]+)',ln)
            assert sm,ln
            for chunk in sm[1].split('、'):
                ns=[int(x) for x in re.findall(r'\d+',chunk)]
                a,b=(ns[0],ns[-1]);assert 1<=a<=b<=len(segs)
                ref['ranges'].append((a,b))
            for kind,hand in [('课程',False),('手写',True),('批注',True)]:
                pm=re.search(kind+r'p\.([^；，。]+)',ln)
                if pm:
                    pp=re.match(r'[\d、–—\-上下]+',pm[1])
                    if pp:
                        for chunk in pp[0].split('、'):
                            ns=[int(x) for x in re.findall(r'\d+',chunk)]
                            if ns:
                                assert all(1<=p<=(HANDCOUNTS[w] if hand else COUNTS[w]) for p in ns)
                                ref['hand' if hand else 'pages'].append((chunk,ns[0]))
            assert ref['pages'],ln
    assert all(r['line'] for r in refs)
    for s in segs:
        s['zh']=zh[s['id']]
        s['knowledge']=[r for r in refs if any(a<=s['id']<=b for a,b in r['ranges'])]
    data[w]={'segs':segs,'note':note,'refs':refs}
    stats.append({'week':w,'words':len(words),'segments':len(segs),'knowledge_points':len(refs),'first':hms(segs[0]['start']),'last':hms(segs[-1]['end']),'english_exact_match':True,'chinese_all_segments':True})

# Small dependency-free renderer for the Markdown forms used in these notes.
def inline(s):
    s=esc(s)
    s=re.sub(r'`([^`]+)`',lambda m:'<code>'+m[1]+'</code>',s)
    s=re.sub(r'\*\*(.+?)\*\*',lambda m:'<strong>'+m[1]+'</strong>',s)
    return s

def links_html(w,r):
    parts=[]
    for hand,key,label in [(False,'pages','课程'),(True,'hand','批注/板书')]:
        for spec,p in r[key]:parts.append(f'<a class="pill" href="{pdfurl(w,p,hand)}" target="_blank" rel="noopener">{label} p.{spec} ↗</a>')
    for a,b in r['ranges']:
        s=data[w]['segs'][a-1]
        parts.append(f'<a class="pill transcript-link" href="#w{w}-s{a:03d}">字幕 {a:03d}–{b:03d} · {hms(s["start"])}</a>')
    return '<div class="source-links">'+''.join(parts)+'</div>'

def links_md(w,r):
    parts=[]
    for hand,key,label in [(False,'pages','课程'),(True,'hand','批注/板书')]:
        for spec,p in r[key]:
            dest=(ROOT/relpdf(w,hand)).as_posix()+f'#page={p}'
            parts.append(f'[{label}p.{spec}](<{dest}>)')
    for a,b in r['ranges']:
        dest=(ROOT/f'第{w}周_双语字幕.md').as_posix()+f'#w{w}-s{a:03d}'
        parts.append(f'[字幕{a:03d}–{b:03d}](<{dest}>)')
    return '定位链接：'+' · '.join(parts)+'\n\n'

def render_md(w,note):
    lines=note.splitlines();out=[];i=0;k=0;cur=None;search_blocks=[];start=0
    while i<len(lines):
        s=lines[i]
        if not s.strip():i+=1;continue
        m=re.match(r'^(#{1,3}) (.*)',s)
        if m:
            level=len(m[1]);attrs=''
            if level==3 and re.match(r'\d+\.',m[2]):
                if cur:search_blocks.append({'id':cur['id'],'w':w,'type':'知识点','title':cur['title'],'text':'\n'.join(lines[start:i])})
                cur=data[w]['refs'][k];k+=1;start=i;attrs=f' id="{cur["id"]}"'
            out.append(f'<h{level}{attrs}>{inline(m[2])}</h{level}>');i+=1;continue
        if s.startswith('|') and i+1<len(lines) and re.match(r'^\|[\s:|\-]+\|?$',lines[i+1]):
            headers=[x.strip() for x in s.strip('|').split('|')];i+=2;rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                cells=[x.strip() for x in lines[i].strip('|').split('|')]
                rows.append('<tr>'+''.join('<td>'+inline(c)+'</td>' for c in cells)+'</tr>');i+=1
            out.append('<div class="table-scroll"><table><thead><tr>'+''.join('<th>'+inline(c)+'</th>' for c in headers)+'</tr></thead><tbody>'+''.join(rows)+'</tbody></table></div>');continue
        if re.match(r'^(?:- |\d+\. )',s):
            ordered=bool(re.match(r'^\d+\.',s));tag='ol' if ordered else 'ul';items=[]
            pattern=r'^\d+\. ' if ordered else r'^- '
            while i<len(lines) and re.match(pattern,lines[i]):
                items.append('<li>'+inline(re.sub(pattern,'',lines[i]))+'</li>');i+=1
            out.append(f'<{tag}>'+''.join(items)+f'</{tag}>');continue
        p=[s];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(?:#|\||- |\d+\. )',lines[i]):p.append(lines[i]);i+=1
        out.append('<p>'+inline('\n'.join(p))+'</p>')
        if s.startswith('**出处：'):
            matching=next((r for r in data[w]['refs'] if r['line']==s),None)
            if matching:out.append(links_html(w,matching))
    if cur:search_blocks.append({'id':cur['id'],'w':w,'type':'知识点','title':cur['title'],'text':'\n'.join(lines[start:])})
    return ''.join(out),search_blocks

all_search=[];panels=[];outlines={}
for w,d in data.items():
    md=d['note'];ki=0;newlines=[]
    for line in md.splitlines():
        if re.match(r'^### \d+\.',line):
            newlines.append(f'<a id="w{w}-k{ki+1}"></a>');ki+=1
        newlines.append(line)
        if line.startswith('**出处：'):
            r=next((r for r in d['refs'] if r['line']==line),None)
            if r:newlines.extend(['',links_md(w,r).rstrip(),''])
    (ROOT/f'第{w}周_知识点.md').write_text('\n'.join(newlines)+'\n',encoding='utf-8-sig')
    transcript=[f'# 第{w}周：双语课堂字幕（阅读整理版）\n',
        '英文保留提供的自动转写原文，未凭空补词，也未按音频重新听校。中文按段翻译整理，合并重复口语与停顿；方括号标注识别问题、校正或整理补充。不是逐词直译，也不是另经音频核验的逐字稿。课堂中包含学生提问，原文件无可靠说话人标签。\n',
        f'共{len(d["segs"])}段。时间来自原JSON，显示到秒；相邻段可能落在同一秒。知识点来源链接另见[本周笔记](<{(ROOT/f"第{w}周_知识点.md").as_posix()}>).\n']
    rendered=[]
    for s in d['segs']:
        sid=f'w{w}-s{s["id"]:03d}';tm=hms(s['start'])+'–'+hms(s['end'])
        transcript.extend([f'<a id="{sid}"></a>\n',f'## {s["id"]:03d}｜{tm}\n','**English · 原始自动字幕**\n',s['en']+'\n','**中文 · 整理译文**\n',s['zh']+'\n'])
        backs=[]
        for r in s['knowledge']:
            dest=(ROOT/f'第{w}周_知识点.md').as_posix()+'#'+r['id']
            backs.append(f'[{r["title"]}](<{dest}>)')
        if backs:transcript.append('关联知识点：'+' · '.join(backs)+'\n')
        hs=''.join(f'<a href="#{r["id"]}">{esc(r["title"])}</a>' for r in s['knowledge'])
        rendered.append(f'<article class="segment" id="{sid}"><div class="segment-head"><b>{s["id"]:03d}</b><span>{tm}</span><a href="#{sid}" aria-label="定位本段">#</a></div><div class="bilingual"><div><span class="lang">EN · 原始自动字幕</span><p>{esc(s["en"])}</p></div><div><span class="lang">中文 · 整理译文</span><p>{esc(s["zh"])}</p></div></div><div class="backlinks">{hs}</div></article>')
        all_search.append({'id':sid,'w':w,'type':'字幕','title':f'{s["id"]:03d} · {tm}','text':s['en']+'\n'+s['zh']})
    (ROOT/f'第{w}周_双语字幕.md').write_text('\n'.join(transcript),encoding='utf-8-sig')
    notes_html,search_blocks=render_md(w,md);all_search.extend(search_blocks)
    resources='<div class="resource-row">'+f'<a href="{pdfurl(w,1)}" target="_blank">课程 PDF · {COUNTS[w]}页 ↗</a><a href="{pdfurl(w,1,True)}" target="_blank">批注/板书 PDF · {HANDCOUNTS[w]}页 ↗</a>'+f'<a href="{quote(f"第{w}周_知识点.md")}" download>下载知识点</a><a href="{quote(f"第{w}周_双语字幕.md")}" download>下载双语字幕</a></div>'
    panels.append(f'<section class="panel" id="w{w}-notes" data-week="{w}" data-view="notes">{resources}<div class="prose">{notes_html}</div></section>')
    panels.append(f'<section class="panel" id="w{w}-transcript" data-week="{w}" data-view="transcript">{resources}<h1>第{w}周 · 双语课堂字幕</h1><p class="notice">全部英文原始转写配逐段中文整理译文。中文合并重复口语，疑似识别错误单独说明；未通过音频复核。共{len(d["segs"])}段。</p>'+''.join(rendered)+'</section>')
    outlines[str(w)]=[{'id':r['id'],'title':r['title']} for r in d['refs']]

readme='''# EE6497 前四周学习整理

打开同目录的“学习导航.html”，按周阅读知识点或双语字幕，也可搜索英文术语和中文关键词。

## 本次交付

四周共64个知识点、881段中英对照。英文保留原始自动转写的全部64,717个词条；中文是逐段阅读整理译文，合并重复口语及停顿，不是逐词直译。四周字幕最后时间分别为03:09:19、02:43:18、02:29:32、02:49:39；这些是时间轴覆盖范围，含休息、互动等待和无字幕间隔，不是净授课时长。

- 第1周：概率建模、常用分布、贝叶斯更新、Beta–Bernoulli、高斯与协方差。
- 第2周：似然、MLE、MAP、交叉熵、线性回归、评估、朴素贝叶斯。
- 第3周：混合模型、GMM、EM、K-means、奇异性与不可识别。
- 第4周：马尔可夫链、HMM、Baum–Welch、前向—后向、各类序列推断。

## 怎样核对来源

每个知识点下有课程PDF页码和课堂字幕范围。学习导航中的页码链接打开对应PDF；字幕链接跳到对应英文与中文，字幕下方可返回关联知识点。PDF页码是文件中的实际页序，与幻灯片页脚可能不同。页码链接默认打开范围的第一页，完整范围保留在标注中。若PDF阅读器不响应页码跳转，可按显示页码手动定位。

同目录“原始材料”保存了12份原文件的副本（8份PDF、4份JSON），并用SHA-256确认与用户目录相同。浏览或移动学习导航时，请连同“原始材料”文件夹一起保留。每周Markdown可单独阅读，里面的本地绝对链接适用于本次输出位置；换电脑后推荐使用相对链接的HTML导航。

原始JSON按词带时间，没有可靠说话人区分。这里按约45秒或明显停顿切成阅读段，按秒显示时间；同一秒中可能前段结束、后段开始。英文中的拼写、重复、误识别和星号照原文保留，不把它当作经音频核验的准确原话。中文依据课件与上下文校正；不确定处明确说明，没有编造缺失内容。

## 已授内容与整理补充

知识点以字幕实际授课为主。课件标为Supplementary的内容，只有字幕确实展开的部分才标为课堂讲过；额外解释、严谨条件、公式勘误和自测属于整理者补充。课后题的参考解答来自课件或按已授原理推导，单独标明，不冒充老师逐题口述。答疑若无单独幻灯片，链接的是相关原理页而非声称课件有该问答。

## 材料完整性提醒

四周主线都讲到了各自总结，暂未发现需要下一份课件才能接完的明显中途截断。仍有这些缺口：

- 第1周00:05:54–00:08:30附近老师麦克风静音，字幕缺失；不能补成原话。
- 多个Wooclap互动题只有字幕口述，没有完整题图与选项。仅恢复可确认的信息。
- 名为Week 1–4的PDF主要是课堂批注／板书，不应一律视为独立、完整的逐题讲解册。
- 第3、4周提到的演示notebook未提供，未声称复现实验结果。
- 作业1文件现已补齐：HW1.pdf确认EE6497必做第3题，截止2026年9月11日23:59。新增HW1讲解从高中数学出发覆盖全部小问。

勘误已放在相关知识点，包括GMM已知分组的nₖ分母、HMM后向递推发射状态、完整数据log项、协方差梯度符号，以及ASR中的术语错误。原件均未修改。

建议每周先看知识点主线，再通过链接查老师的说法，最后独立做题并核对解法。第二周MLE/MAP连接第三周EM，第三周隐变量思想再连接第四周HMM。
'''
(ROOT/'阅读说明.md').write_text(readme,encoding='utf-8-sig')
style='''
:root{--ink:#18332f;--muted:#64736e;--accent:#087f70;--line:#dce6e1;--paper:#fff;--bg:#f4f7f3}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 "Microsoft YaHei","Segoe UI",sans-serif}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}button,input{font:inherit}button{cursor:pointer}header{position:sticky;top:0;z-index:5;padding:15px 30px;background:#173d35;color:white;display:flex;align-items:center;gap:22px;box-shadow:0 2px 15px #0001}.brand{line-height:1.3;white-space:nowrap}.brand strong{display:block;font-size:21px;letter-spacing:1px}.brand small{color:#c1dcd1;font-size:12px}.searchbar{display:flex;flex:1;max-width:620px;margin-left:auto}.searchbar input{min-width:100px;flex:1;border:0;padding:9px 14px;border-radius:7px 0 0 7px}.searchbar button{border:0;border-radius:0 7px 7px 0;padding:8px 18px;color:#164439;background:#bde8cc}header>a{color:#d5ece1;font-size:13px}.layout{display:grid;grid-template-columns:270px minmax(0,1fr);max-width:1600px;margin:auto}aside{position:sticky;top:87px;height:calc(100vh - 95px);overflow:auto;padding:28px 20px 32px}.eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin:0 0 12px}.weeks{display:grid;gap:7px}.week{padding:12px;text-align:left;border:1px solid var(--line);border-radius:9px;background:white;color:var(--ink);font-size:14px}.week.active{background:#e0f1e5;border-color:#9ecbb5}.week b{margin-right:9px;color:var(--accent)}.views{display:flex;margin:20px 0;gap:6px}.views button{flex:1;padding:7px 2px;border:1px solid var(--line);background:white;color:var(--ink);border-radius:5px;font-size:13px}.views .active{background:var(--accent);color:white;border-color:var(--accent)}#outline a{display:block;color:#526660;font-size:12px;line-height:1.55;margin:10px 0;padding-left:8px;border-left:2px solid #d8e3dc}main{padding:30px 38px 100px;min-width:0}.hero{padding:22px 28px;background:linear-gradient(110deg,#e3eee0,#eef4e8);border:1px solid #d7e3d2;border-radius:12px;margin-bottom:25px}.hero h2{margin:0;font-size:25px}.hero p{margin:7px 0;color:#53695c;font-size:14px}.stats{display:flex;gap:25px;margin-top:12px;font-size:13px}.stats b{font-size:22px;margin-right:5px}.panel[hidden]{display:none}.resource-row{display:flex;gap:9px;flex-wrap:wrap;font-size:12px;margin-bottom:22px}.resource-row a{padding:5px 10px;background:white;border:1px solid var(--line);border-radius:5px}.prose{max-width:1060px;background:white;padding:27px 34px;border:1px solid var(--line);border-radius:10px}.prose h1{font-size:27px;line-height:1.5;margin:0 0 20px}.prose h2{font-size:21px;margin:35px 0 16px;border-bottom:1px solid var(--line);padding-bottom:9px}.prose h3{font-size:19px;margin:35px 0 12px;border-left:4px solid var(--accent);padding-left:13px;scroll-margin-top:100px}.prose p{margin:12px 0;overflow-wrap:anywhere}.prose p:has(>strong:only-child){font-size:13px;color:var(--muted);line-height:1.7}.prose code{overflow-wrap:anywhere;word-break:break-word;font-size:13px;background:#f2f5f2;padding:2px 4px}.source-links{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 20px}.pill{font-size:12px;border:1px solid #cbded5;border-radius:20px;padding:3px 10px;background:#f3f8f3}.transcript-link{background:#eef4fd;border-color:#d4dfe9;color:#315580}.table-scroll{overflow-x:auto;margin:16px 0}table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.7}th,td{text-align:left;padding:11px 12px;border:1px solid var(--line);min-width:75px}th{background:#edf3ee}tr:nth-child(even){background:#fafcf9}li{margin:7px 0}.notice{background:#edf3ee;border-left:3px solid var(--accent);padding:12px 17px;font-size:13px}.segment{background:white;border:1px solid var(--line);border-radius:9px;margin:20px 0;padding:20px 24px;scroll-margin-top:100px}.segment-head{display:flex;align-items:center;gap:15px;border-bottom:1px solid #edf1eb;padding-bottom:10px}.segment-head b{color:var(--accent)}.segment-head span{font:13px "Segoe UI",sans-serif;color:var(--muted)}.segment-head a{margin-left:auto}.bilingual{display:grid;grid-template-columns:1fr 1fr;gap:27px;margin-top:12px}.bilingual>div:first-child{border-right:1px solid #edf1eb;padding-right:25px}.bilingual p{font-size:15px;line-height:1.85;margin:5px 0;overflow-wrap:anywhere}.lang{font-size:10px;letter-spacing:1px;color:var(--muted)}.backlinks{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-top:13px}.search-results{background:white;border:1px solid var(--line);border-radius:9px;padding:22px;margin-bottom:24px}.search-result{display:block;padding:13px 0;border-bottom:1px solid var(--line)}.search-result small{display:block;color:var(--muted)}.search-result p{color:var(--ink);font-size:13px;margin:4px 0}.search-results button{float:right;background:#edf3ee;border:0;border-radius:5px;padding:4px 12px}.foot{font-size:12px;color:var(--muted);margin-top:30px}:target{outline:2px solid #dfb55c;outline-offset:5px}@media(max-width:950px){.layout{grid-template-columns:220px 1fr}main{padding:22px 20px}.prose{padding:22px}.bilingual{grid-template-columns:1fr;gap:8px}.bilingual>div:first-child{border-right:0;padding-right:0;border-bottom:1px solid var(--line);padding-bottom:12px}header{padding:13px 20px}}@media(max-width:650px){header{position:static;flex-wrap:wrap;gap:12px}.searchbar{order:3;flex-basis:100%;max-width:none}.layout{display:block}aside{position:static;height:auto;padding:16px}.weeks{grid-template-columns:1fr 1fr}.week{font-size:12px}.views{margin:12px 0 0}#outline,.eyebrow{display:none}main{padding:10px 16px 60px}.prose{padding:20px 17px}.prose h1{font-size:23px}.hero{padding:17px}.hero h2{font-size:21px}.stats{gap:14px}.stats b{font-size:18px}.segment{padding:16px}.resource-row a{font-size:11px}}@media print{header,aside,.hero,.resource-row,.search-results{display:none}.layout{display:block}main,.prose{padding:0;border:0}.panel[hidden]{display:none}.source-links{font-size:10px}body{background:white;font-size:12px}.segment{break-inside:avoid}.bilingual{grid-template-columns:1fr 1fr}h3{break-after:avoid}}
'''
js='''
let activeWeek=1,activeView='notes';
const panels=[...document.querySelectorAll('.panel')];
function show(w,v){activeWeek=Number(w);activeView=v;panels.forEach(p=>p.hidden=!(Number(p.dataset.week)===activeWeek&&p.dataset.view===v));document.querySelectorAll('.week').forEach(b=>b.classList.toggle('active',Number(b.dataset.week)===activeWeek));document.querySelectorAll('.view').forEach(b=>b.classList.toggle('active',b.dataset.view===v));document.getElementById('outline').replaceChildren();for(const r of OUTLINES[String(activeWeek)]){let a=document.createElement('a');a.href='#'+r.id;a.textContent=r.title;document.getElementById('outline').append(a)}}
function route(){const id=decodeURIComponent(location.hash.slice(1));const m=id.match(/^w([1-4])-(s\\d+|k\\d+|notes|transcript)$/);if(m){show(m[1],m[2].startsWith('s')||m[2]==='transcript'?'transcript':'notes');requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'auto',block:'start'}))}else show(activeWeek,activeView)}
document.querySelectorAll('.week').forEach(b=>b.addEventListener('click',()=>{location.hash='w'+b.dataset.week+'-'+activeView}));document.querySelectorAll('.view').forEach(b=>b.addEventListener('click',()=>{location.hash='w'+activeWeek+'-'+b.dataset.view}));window.addEventListener('hashchange',route);route();
const results=document.getElementById('results');function closeSearch(){results.hidden=true}document.getElementById('searchform').addEventListener('submit',e=>{e.preventDefault();const q=document.getElementById('query').value.trim();if(!q){closeSearch();return}const terms=q.toLocaleLowerCase().split(/\\s+/);const found=SEARCH.filter(r=>terms.every(t=>(r.title+' '+r.text).toLocaleLowerCase().includes(t)));results.replaceChildren();let close=document.createElement('button');close.textContent='收起';close.onclick=closeSearch;results.append(close);let head=document.createElement('h2');head.textContent='搜索：'+q+' · '+found.length+'条';results.append(head);for(const r of found.slice(0,150)){let a=document.createElement('a');a.className='search-result';a.href='#'+r.id;a.onclick=()=>{closeSearch();if(location.hash==='#'+r.id)route()};let small=document.createElement('small');small.textContent='第'+r.w+'周 · '+r.type;let strong=document.createElement('strong');strong.textContent=r.title;let p=document.createElement('p');let pos=r.text.toLocaleLowerCase().indexOf(terms[0]);p.textContent=r.text.slice(Math.max(0,pos-40),Math.max(0,pos-40)+210).replace(/\\n/g,' ')+'…';a.append(small,strong,p);results.append(a)}if(found.length>150){let p=document.createElement('p');p.textContent='显示前150条，请增加关键词缩小范围。';results.append(p)}results.hidden=false;results.scrollIntoView({behavior:'smooth'})});
'''
weekbuttons=''.join(f'<button class="week" data-week="{w}"><b>0{w}</b>{TITLES[w]}</button>' for w in data)
page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EE6497 · 前四周学习导航</title><style>'+style+'</style></head><body><header><div class="brand"><strong>EE6497</strong><small>PATTERN RECOGNITION & DEEP LEARNING</small></div><form class="searchbar" id="searchform"><input id="query" aria-label="搜索四周知识点及中英字幕" placeholder="搜索知识点、英文术语或字幕…"><button type="submit">搜索</button></form><a href="'+quote('阅读说明.md')+'">阅读说明 ↗</a></header><div class="layout"><aside><p class="eyebrow">COURSE COMPANION · WEEKS 01–04</p><div class="weeks">'+weekbuttons+'</div><div class="views"><button class="view" data-view="notes">知识点整理</button><button class="view" data-view="transcript">双语字幕</button></div><nav id="outline" aria-label="本周知识点"></nav><div class="foot">PDF页码按实际页序。<br>英文原文保留自动转写错误；<br>中文为阅读整理译文。</div></aside><main><div class="hero"><p class="eyebrow">从概率基础到隐状态序列</p><h2>每个知识点，都能回到课堂。</h2><p>按周梳理 · 课件与字幕双重定位 · 练习、补充内容和勘误分明</p><div class="stats"><span><b>4</b>周课程</span><span><b>64</b>个知识点</span><span><b>881</b>段中英对照</span></div></div><div class="search-results" id="results" hidden></div>'+''.join(panels)+'<div class="foot">整理依据用户提供的课程PDF、课堂板书及自动字幕。所有来源副本随文件保留；缺失题图与未提供的notebook未作推测性重建。</div></main></div><script>const SEARCH='+json.dumps(all_search,ensure_ascii=False).replace('</','<\/')+';const OUTLINES='+json.dumps(outlines,ensure_ascii=False)+';'+js+'</script></body></html>'
(ROOT/'学习导航.html').write_text(page,encoding='utf-8')
# Structural audit of every HTML fragment and copied source reference.
class Audit(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.hrefs=[]
    def handle_starttag(self,tag,attrs):
        d=dict(attrs)
        if 'id' in d:self.ids.append(d['id'])
        if 'href' in d:self.hrefs.append(d['href'])
a=Audit();a.feed(page);assert len(a.ids)==len(set(a.ids))
for href in a.hrefs:
    if href.startswith('#'):assert href[1:] in a.ids,href
    elif not href.startswith(('http:','https:')):assert (ROOT/unquote(href.split('#')[0])).exists(),href
report={'weeks':stats,'total_words':sum(s['words'] for s in stats),'total_segments':sum(s['segments'] for s in stats),'total_knowledge_points':sum(s['knowledge_points'] for s in stats),'all_local_html_links_valid':True,'source_copies_sha256':source_hashes}
assert report['total_segments']==881 and report['total_knowledge_points']==64
(ROOT/'核对记录.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
# Archive contains deliverables and sources, excluding extraction/intermediate files.
zip_path=ROOT.parent/'EE6497_前四周学习整理.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for f in ROOT.rglob('*'):
        if f.is_file() and '素材提取' not in f.parts:z.write(f,Path('EE6497整理')/f.relative_to(ROOT))
print(json.dumps({k:v for k,v in report.items() if k!='source_copies_sha256'},ensure_ascii=False,indent=2))
print('HTML bytes:',(ROOT/'学习导航.html').stat().st_size,'ZIP bytes:',zip_path.stat().st_size)
