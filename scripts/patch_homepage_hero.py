from pathlib import Path
import re

path = Path('src/pages/HomePage.tsx')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r'    if \(data && data\.length > 0\) \{\n      setBanners\(data\);\n    \} else \{\n      // Fallback banners\n      setBanners\(\[.*?\n      \]\);\n    \}\n', re.S)
new_text, count = pattern.subn('    setBanners(data || []);\n', text, count=1)
if count == 0:
    raise SystemExit('pattern not found')
path.write_text(new_text, encoding='utf-8')
print('hero fallback removed')
