#!/usr/bin/env python3
"""Reproducible frequency screening; no claim of individual word knowledge."""
import csv, hashlib, json, re, subprocess
from collections import Counter
from pathlib import Path
from wordfreq import zipf_frequency
ROOT = Path(__file__).resolve().parent.parent
stories = json.loads((ROOT/'stories.json').read_text())
js = "const p=require('./learning-policy.js'),s=require('./stories.json');console.log(JSON.stringify(s.map(x=>({id:x.id,...p.inspect(x)}))))"
checks = json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,text=True))
limits = [(5,0),(7,1),(9,1.5),(11,2),(13,2.5),(15,3),(17,3.5),(20,4.5),(22,5),(25,6)]
rows=[]
for s,c in zip(stories,checks):
    words=re.findall(r"[A-Za-z]+(?:['’-][A-Za-z]+)*",s['text'])
    # Exclude only names explicitly supplied by the author, not all capitalized words.
    names=set(w.lower() for w in s.get('properNames',[]))
    lexical=[w.lower() for w in words if w.lower() not in names]
    f=[zipf_frequency(w,'en') for w in lexical]
    low=100*sum(v<4 for v in f)/max(1,len(f)); very=100*sum(v<3 for v in f)/max(1,len(f))
    a,b=limits[s['level']-1]
    flags=list(c['warnings'])
    if low>a:flags.append('low-frequency')
    if very>b:flags.append('very-low-frequency')
    terms=Counter(w for w,v in zip(lexical,f) if v<4)
    rows.append(dict(id=s['id'],level=s['level'],topic=s['topic'],title=s['title'],text_sha256=hashlib.sha256(s['text'].encode()).hexdigest(),**c['metrics'],low_frequency_pct=round(low,2),very_low_frequency_pct=round(very,2),frequency_terms='; '.join(f'{w} ({n})' for w,n in terms.most_common(15)),errors=';'.join(c['errors']),flags=';'.join(flags),status='needs-editorial-review' if flags or c['errors'] else 'automated-screen-clear'))
with (ROOT/'learning_audit_2570.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
(ROOT/'learning_audit_records.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
summary=dict(stories=len(rows),words=sum(s['wordCount'] for s in stories),errors=sum(bool(r['errors']) for r in rows),flagged=sum(bool(r['flags']) for r in rows),byLevel={l:dict(count=sum(r['level']==l for r in rows),flagged=sum(r['level']==l and bool(r['flags']) for r in rows)) for l in range(1,11)},method='wordfreq 3.1.1 Zipf token frequency; not a headword list, CEFR score or measured known-word percentage')
(ROOT/'learning_audit_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
# Keep the editorial queue tied to the current corpus, including inherited additions.
# Frequency alone is advisory; prioritize syntax within each learning level.
syntax_flags={'long-sentence','dense-syntax','advanced-structure','advanced-expression'}
followup=sorted((r for r in rows if r['flags'] or r['errors']),key=lambda r:(r['level'],not bool(r['errors']),not bool(set(r['flags'].split(';')) & syntax_flags),int(r['id'][1:])))
with (ROOT/'content/editorial-followup.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(followup)
print(json.dumps(summary,indent=2))
