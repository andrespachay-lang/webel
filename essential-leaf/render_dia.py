"""Renderiza dias/AAAA-MM-DD/html/*.html a dias/AAAA-MM-DD/posts/NN_nombre.jpg (1080x1350)
y arma revision.jpg (hoja de contacto) en la misma carpeta.
Uso: python render_dia.py dias/AAAA-MM-DD [NN NN ...]   (números opcionales: solo esas piezas)"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).parent
DIA = (ROOT / sys.argv[1]).resolve()
solo = sys.argv[2:]
POSTS = DIA / "posts"
POSTS.mkdir(exist_ok=True)
tmp = DIA / "_tmp.png"

with sync_playwright() as p:
    exe = "/opt/pw-browsers/chromium"
    b = p.chromium.launch(executable_path=exe if os.path.exists(exe) else None)
    page = b.new_page(viewport={"width": 1080, "height": 1350})
    for f in sorted((DIA / "html").glob("*.html")):
        if solo and f.stem.split("_")[0] not in solo:
            continue
        page.goto(f.resolve().as_uri())
        page.wait_for_load_state("networkidle")
        page.evaluate("document.fonts.ready")
        page.screenshot(path=str(tmp))
        Image.open(tmp).convert("RGB").save(POSTS / f"{f.stem}.jpg", quality=92, optimize=True)
    b.close()
tmp.unlink(missing_ok=True)

piezas = sorted(POSTS.glob("*.jpg"))
W, H = 360, 450
cols = 4
filas = (len(piezas) + cols - 1) // cols
hoja = Image.new("RGB", (cols * W, filas * H), "white")
for i, f in enumerate(piezas):
    hoja.paste(Image.open(f).resize((W, H)), ((i % cols) * W, (i // cols) * H))
hoja.save(DIA / "revision.jpg", quality=85)
print(len(piezas), "posts en", POSTS)
