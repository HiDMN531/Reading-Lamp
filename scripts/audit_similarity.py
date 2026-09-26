#!/usr/bin/env python3
import json
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
R=Path(__file__).resolve().parent.parent
s=json.loads((R/'stories.json').read_text())
x=TfidfVectorizer(stop_words='english',ngram_range=(1,2)).fit_transform(a['text'] for a in s)
c=(x[2070:]@x.T).toarray();pairs=[]
for i in range(len(s)-2070):
 c[i,2070+i]=-1;j=int(c[i].argmax())
 pairs.append(dict(id=s[2070+i]['id'],closest=s[j]['id'],similarity=round(float(c[i,j]),4),title=s[2070+i]['title']))
r=dict(method='TF-IDF unigram+bigram cosine; English stop words; all additions against full corpus, no self matches',maxSimilarity=max(p['similarity'] for p in pairs),over08=sum(p['similarity']>=.8 for p in pairs),nearest=pairs)
(R/'similarity_report.json').write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({k:v for k,v in r.items() if k!='nearest'}))
