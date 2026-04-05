from pathlib import Path
p=Path('src/styles.css')
text=p.read_text(encoding='utf-8')
open_count=text.count('{')
close_count=text.count('}')
print('open',open_count,'close',close_count)
bal=0
for i,line in enumerate(text.splitlines(),1):
    bal += line.count('{') - line.count('}')
    if bal < 0:
        print('mismatch at', i, 'bal', bal)
        break
print('final balance', bal)
