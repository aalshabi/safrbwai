import sys, json, re
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(s):
        super().__init__(convert_charrefs=True); s.d={"html":{},"title":None,"meta":[],"links":[],"jsonld":[],"headings":[]}
        s.cur=None; s.buf=""; s.depth=0
    def handle_starttag(s,t,a):
        a=dict(a)
        if t=="html": s.d["html"]={"lang":a.get("lang"),"dir":a.get("dir")}
        elif t=="meta": s.d["meta"].append({k:a[k] for k in ("name","property","content","charset","http-equiv","media") if k in a})
        elif t=="link":
            rel=(a.get("rel") or "").lower()
            if any(r in rel.split() for r in ("canonical","alternate","icon","apple-touch-icon","manifest","shortcut")):
                s.d["links"].append({k:a[k] for k in ("rel","href","hreflang","type","sizes","media") if k in a})
        elif t=="title" and s.cur is None: s.cur="title"; s.buf=""
        elif t=="script" and a.get("type")=="application/ld+json": s.cur="jsonld"; s.buf=""
        elif t in ("h1","h2","h3") and s.cur is None: s.cur=t; s.buf=""
    def handle_endtag(s,t):
        if s.cur=="title" and t=="title": s.d["title"]=s.buf.strip(); s.cur=None
        elif s.cur=="jsonld" and t=="script":
            try: s.d["jsonld"].append(json.loads(s.buf))
            except Exception as e: s.d["jsonld"].append({"_unparsed":s.buf})
            s.cur=None
        elif s.cur==t and t in ("h1","h2","h3"):
            s.d["headings"].append({"tag":t,"text":re.sub(r"\s+"," ",s.buf).strip()}); s.cur=None
    def handle_data(s,x):
        if s.cur: s.buf+=x
p=P(); p.feed(open(sys.argv[1],encoding="utf-8").read())
p.d["source"]=sys.argv[3] if len(sys.argv)>3 else sys.argv[1]
json.dump(p.d,open(sys.argv[2],"w",encoding="utf-8"),ensure_ascii=False,indent=2,sort_keys=True)
