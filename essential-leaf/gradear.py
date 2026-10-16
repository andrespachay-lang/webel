"""Tratamiento de color de la marca (verdes profundos y marrones cálidos, sombras verdosas).
Uso: python gradear.py CARPETA_ORIGEN   -> escribe cada .jpg/.png en assets/stock/ con el mismo nombre (.jpg)."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ORIGEN, OUT = Path(sys.argv[1]), Path(__file__).parent / "assets" / "stock"
SOMBRA = np.array([28, 34, 20], np.float32)

for f in sorted(list(ORIGEN.glob("*.jpg")) + list(ORIGEN.glob("*.jpeg")) + list(ORIGEN.glob("*.png"))):
    im = Image.open(f).convert("RGB"); im.thumbnail((1700, 1700), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    lum = a @ np.array([.299, .587, .114], np.float32)
    a = a * .86 + lum[..., None] * .14
    a *= np.array([1.03, 1.0, .86], np.float32)
    a = 255 * (a / 255) ** 1.12
    t = lum[..., None] / 255.0
    a = a * (1 - .22 * (1 - t)) + SOMBRA * .22 * (1 - t)
    a = 8 + a * (240 / 255)
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(OUT / (f.stem + ".jpg"), quality=84, optimize=True)
    print(f.stem, im.size)
