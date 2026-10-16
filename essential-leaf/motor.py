"""Motor de piezas de Essential Leaf. Uso: python motor.py dias/AAAA-MM-DD
Lee dias/AAAA-MM-DD/plan.json y escribe un HTML por pieza en dias/AAAA-MM-DD/html/.
Basado en la serie 61-100 (1080x1350) inspirada en la referencia de esquemas finos sobre foto:
encabezado de tres columnas, tipografía fina en mayúsculas y diagramas de línea
(lista con flechas, Venn, infinito, anillo, camino, línea vertical, pregunta).
Productos e ingredientes según el catálogo 2026; sin promesas de efectos.
Genera html/NN_*.html; render_feed100.py los pasa a PNG en EL_feed_100/."""
from pathlib import Path

import json, sys

ROOT = Path(__file__).parent
DIA = (ROOT / sys.argv[1]).resolve()
OUT = DIA / "html"
OUT.mkdir(parents=True, exist_ok=True)
for f in OUT.glob("*.html"):
    f.unlink()

A = "../../../assets"  # desde dias/AAAA-MM-DD/html/
VERDE, VERDE_M, DORADO_C, CREMA, CAFE = "#2D3220", "#4A5530", "#D9C27A", "#F4F0E1", "#4a3424"

CSS = f"""
@font-face{{font-family:Montserrat;src:url({A}/fonts/Montserrat-VF.woff2);font-weight:100 900}}
@font-face{{font-family:Alegreya;src:url({A}/fonts/Alegreya-VF.woff2);font-weight:400 900}}
@font-face{{font-family:Alegreya;src:url({A}/fonts/Alegreya-Italic-VF.woff2);font-style:italic;font-weight:400 900}}
@font-face{{font-family:"Alegreya SC";src:url({A}/fonts/AlegreyaSC-500.woff2);font-weight:500}}
html,body{{margin:0;width:1080px;height:1350px;overflow:hidden;background:{VERDE}}}
.pz{{position:relative;width:1080px;height:1350px;overflow:hidden;color:{CREMA};font-family:Montserrat}}
.lleno{{position:absolute;inset:0;width:1080px;height:1350px}}
.foto{{object-fit:cover}}
.grano{{background:url({A}/grano.png);mix-blend-mode:overlay;opacity:.7}}
.cab{{position:absolute;left:60px;right:60px;top:52px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;
  font:500 15px/1 Montserrat;letter-spacing:.3em;text-transform:uppercase}}
.cab .d{{text-align:right;letter-spacing:.12em;text-transform:none;font-size:16px}}
.cab img{{width:118px;display:block}}
.caps{{font-weight:500;letter-spacing:.14em;text-transform:uppercase}}
.cur{{font-family:Alegreya;font-style:italic;font-weight:400}}
.sc{{font-family:"Alegreya SC";font-weight:500;letter-spacing:.06em}}
.cuerpo{{font:400 23px/1.55 Montserrat}}
.oro{{color:{DORADO_C}}}
.som{{text-shadow:0 2px 18px rgba(12,14,8,.55)}}
.bloque{{position:absolute;left:150px;right:150px;text-align:center}}
.prod{{position:absolute;filter:drop-shadow(0 18px 24px rgba(10,12,6,.5))}}
.flecha-c{{display:inline-flex;flex-direction:column;align-items:center;gap:8px;font:500 13px/1 Montserrat;letter-spacing:.24em;text-transform:uppercase}}
.flecha-c i{{width:58px;height:58px;border:1.5px solid currentColor;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:24px}}
.boton{{display:inline-block;border:1.5px solid currentColor;padding:15px 34px;font:500 16px/1 Montserrat;letter-spacing:.24em;text-transform:uppercase}}
"""

FLECHA_ABAJO = ('<svg width="24" height="70" viewBox="0 0 24 70" style="display:block;margin:26px auto">'
                '<path d="M12 2 V66 M3 56 L12 66 L21 56" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>')
CHECK = ('<svg width="22" height="18" viewBox="0 0 22 18" style="flex:none"><path d="M2 9 L8 15 L20 3" fill="none" '
         'stroke="currentColor" stroke-width="1.8"/></svg>')


def cab(izq, der="@essentialleaf.ec"):
    return (f'<div class="cab som"><div>{izq}</div><img src="{A}/logos/logo-crema.png" alt="Essential Leaf">'
            f'<div class="d">{der}</div></div>')


def foto(archivo, pos="50% 50%", filtro=""):
    return f'<img class="lleno foto" style="object-position:{pos};{filtro}" src="{A}/stock/{archivo}.jpg" alt="">'


def velo(op=.45, arriba=.25, abajo=.25):
    return (f'<div class="lleno" style="background:rgba(16,18,10,{op})"></div>'
            f'<div class="lleno" style="background:linear-gradient(180deg,rgba(14,16,8,{arriba}),rgba(14,16,8,0) 30%,'
            f'rgba(14,16,8,0) 70%,rgba(14,16,8,{abajo}))"></div>')


def pagina(n, nombre, cuerpo, script=""):
    js = f"<script>{script}</script>" if script else ""
    (OUT / f"{n:02d}_{nombre}.html").write_text(
        f'<!doctype html><html lang="es"><head><meta charset="utf-8"><style>{CSS}</style></head>'
        f'<body><div class="pz">{cuerpo}<div class="lleno grano"></div></div>{js}</body></html>', encoding="utf-8")


# fotos con cielo o agua azul: se llevan a la gama oliva
TINTAR = {"v_n_chimborazo": .6, "v_n_agua_textura": .7}


def fondo(archivo, pos, op, etiqueta, arriba=.3, abajo=.3):
    t = (f'<div class="lleno" style="background:#76804a;mix-blend-mode:color;opacity:{TINTAR[archivo]}"></div>'
         if archivo in TINTAR else "")
    return foto(archivo, pos) + t + velo(op, arriba, abajo) + cab(etiqueta)


# ---- tipos ---------------------------------------------------------------
def portada(n, nombre, archivo, pequeno, titulo, sub, boton, pos="50% 50%", op=.38, tam=150):
    pagina(n, nombre, fondo(archivo, pos, op, pequeno) + f"""
  <div class="bloque som" style="top:0;height:1350px;display:flex;flex-direction:column;justify-content:center;left:80px;right:80px">
    <div class="caps" style="font-size:20px;letter-spacing:.4em">{pequeno}</div>
    <div class="sc" style="font-size:{tam}px;line-height:1;margin-top:26px;letter-spacing:.1em">{titulo}</div>
    <svg width="34" height="20" viewBox="0 0 34 20" style="display:block;margin:30px auto 0"><path d="M2 3 L17 17 L32 3" fill="none" stroke="{CREMA}" stroke-width="1.6"/></svg>
    <div class="caps oro" style="font-size:22px;line-height:1.6;margin-top:30px">{sub}</div>
    <div style="margin-top:56px"><span class="boton">{boton}</span></div>
  </div>
  <div class="bloque" style="bottom:70px"><div class="sc" style="font-size:34px;letter-spacing:.24em">Essential Leaf</div>
    <div class="caps" style="font-size:13px;letter-spacing:.5em;margin-top:10px;opacity:.85">Botanical beauty</div></div>""")


def lista(n, nombre, archivo, etiqueta, titulo, parrafo, items, cierre, pie, pos="50% 50%", op=.5):
    lis = "".join(f'<div style="display:flex;gap:18px;align-items:center;margin:14px 0">{CHECK}<span>{t}</span></div>' for t in items)
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta, abajo=.5) + f"""
  <div class="bloque som" style="top:190px">
    <div class="caps" style="font-size:28px;line-height:1.35">“{titulo}”</div>
    <p class="cuerpo" style="margin:26px auto 0;max-width:700px">{parrafo}</p>
    {FLECHA_ABAJO}
    <div class="cuerpo" style="display:inline-block;text-align:left">{lis}</div>
    {FLECHA_ABAJO}
    <div class="caps" style="font-size:24px;line-height:1.5">{cierre}</div>
  </div>
  <div class="som" style="position:absolute;left:80px;right:80px;bottom:80px;display:flex;justify-content:space-between;align-items:flex-end">
    <p class="cuerpo" style="margin:0;max-width:640px;font-size:21px">{pie}</p><span class="flecha-c"><i>→</i>desliza</span>
  </div>""")


def venn(n, nombre, archivo, etiqueta, arriba, circulos, abajo, pos="50% 50%", op=.3):
    R = 165
    centros = [(540, 560), (445, 725), (635, 725)]
    textos = [(540, 500), (395, 770), (685, 770)]
    circ = "".join(f'<div style="position:absolute;left:{x - R}px;top:{y - R}px;width:{2 * R}px;height:{2 * R}px;border-radius:50%;'
                   f'background:rgba(244,240,225,.58);border:1.5px solid rgba(244,240,225,.9)"></div>' for x, y in centros)
    txt = "".join(f'<div style="position:absolute;left:{x - 120}px;top:{y - 40}px;width:240px;height:80px;display:flex;flex-direction:column;'
                  f'justify-content:center;text-align:center;color:{VERDE}"><div class="caps" style="font-size:19px;line-height:1.3;font-weight:700">{t}</div>'
                  f'<div style="font:600 15px/1.35 Montserrat;margin-top:6px">{s}</div></div>'
                  for (x, y), (t, s) in zip(textos, circulos))
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta, abajo=.55) + f"""
  <div class="bloque caps som" style="top:230px;font-size:24px;line-height:1.5">{arriba}</div>
  {circ}{txt}
  <div class="bloque caps som" style="top:1000px;font-size:22px;line-height:1.55">{abajo}</div>
  <div class="bloque som" style="top:1150px"><span class="flecha-c"><i>→</i>desliza</span></div>""")


def infinito(n, nombre, archivo, etiqueta, arriba, sub, lazo1, lazo2, abajo, pos="50% 50%", op=.42):
    d = "M540 700 C700 580 690 430 540 430 C390 430 380 580 540 700 C700 820 690 970 540 970 C390 970 380 820 540 700 Z"
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="bloque som" style="top:200px"><div class="caps" style="font-size:26px;line-height:1.45">{arriba}</div>
    <div class="cur" style="font-size:28px;margin-top:14px;opacity:.9">{sub}</div></div>
  <svg class="lleno" viewBox="0 0 1080 1350"><path d="{d}" fill="none" stroke="{CREMA}" stroke-opacity=".28" stroke-width="22"/>
    <path d="{d}" fill="none" stroke="{CREMA}" stroke-opacity=".9" stroke-width="1.6"/></svg>
  <div class="caps som" style="position:absolute;left:430px;width:220px;top:520px;height:120px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:17px;line-height:1.5">{lazo1}</div>
  <div class="caps som" style="position:absolute;left:430px;width:220px;top:760px;height:120px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:17px;line-height:1.5">{lazo2}</div>
  <div class="bloque caps som" style="top:1060px;font-size:23px;line-height:1.55">{abajo}</div>""")


def anillo(n, nombre, archivo, etiqueta, pequeno, titulo, centro, puntos, pie, pos="50% 50%", op=.45, disco=CREMA):
    cx, cy, R = 540, 760, 250
    marcas = [(cx - 177, cy - 177), (cx + 177, cy - 177), (cx - 177, cy + 177), (cx + 177, cy + 177)]
    lbl = []
    for (x, y), (t, s) in zip(marcas, puntos):
        izq = x < cx
        lbl.append(f'<div class="som" style="position:absolute;top:{y - 30}px;{"right:" + str(1080 - x + 26) if izq else "left:" + str(x + 26)}px;'
                   f'width:250px;text-align:{"right" if izq else "left"}"><div class="caps" style="font-size:18px">{t}</div>'
                   f'<div style="font:400 16px/1.4 Montserrat;margin-top:6px;opacity:.85">{s}</div></div>')
    dots = "".join(f'<circle cx="{x}" cy="{y}" r="7" fill="{CREMA}"/>' for x, y in marcas)
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="bloque som" style="top:200px"><div class="caps" style="font-size:18px;letter-spacing:.4em">{pequeno}</div>
    <div class="sc" style="font-size:76px;line-height:1.05;margin-top:12px">{titulo}</div></div>
  <svg class="lleno" viewBox="0 0 1080 1350"><circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{CREMA}" stroke-width="1.5" stroke-opacity=".9"/>{dots}</svg>
  <div style="position:absolute;left:{cx - 165}px;top:{cy - 165}px;width:330px;height:330px;border-radius:50%;background:{disco};overflow:hidden;
    box-shadow:0 10px 40px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">{centro}</div>
  {''.join(lbl)}
  <div class="bloque caps som" style="top:1110px;font-size:19px;line-height:1.6">{pie}</div>""")


def camino(n, nombre, archivo, etiqueta, arriba, rotulo, pasos, pos="50% 50%", op=.5):
    y0, g, xl, xr = 530, 136, 150, 930
    d = f"M{xl} {y0} H{xr}"
    for i in range(1, len(pasos)):
        y = y0 + i * g
        d += (f" A{g / 2} {g / 2} 0 0 1 {xr} {y} H{xl}" if i % 2 else f" A{g / 2} {g / 2} 0 0 0 {xl} {y} H{xr}")
    dots, txt = "", ""
    for i, (t, s) in enumerate(pasos):
        y = y0 + i * g
        x = xr if i % 2 == 0 else xl
        dots += f'<circle cx="{x}" cy="{y}" r="8" fill="{CREMA}"/>'
        lado = f"right:{1080 - xr + 30}px;text-align:right" if i % 2 == 0 else f"left:{xl + 30}px;text-align:left"
        txt += (f'<div class="som" style="position:absolute;{lado};top:{y - 66}px;width:640px"><div class="caps" style="font-size:19px">{t}</div>'
                f'<div style="font:400 16px/1.4 Montserrat;margin-top:6px;opacity:.85">{s}</div></div>')
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="bloque som" style="top:205px"><div class="cur" style="font-size:30px;opacity:.9">{arriba}</div>
    <div style="margin-top:22px"><span class="caps" style="font-size:20px;border-bottom:1.5px solid {CREMA};padding-bottom:8px">{rotulo}</span></div></div>
  <svg class="lleno" viewBox="0 0 1080 1350"><path d="{d}" fill="none" stroke="{CREMA}" stroke-opacity=".85" stroke-width="1.6"/>{dots}</svg>
  {txt}""")


def vertical(n, nombre, archivo, etiqueta, intro, destaca, puntos, pos="50% 50%", op=.45):
    d = "M560 470 C760 560 760 640 600 720 S420 880 600 960 S780 1120 560 1230"
    pts = "".join(f'<div class="pt som" style="position:absolute;width:330px"><div class="caps" style="font-size:18px">{t}</div>'
                  f'<div style="font:400 16px/1.4 Montserrat;margin-top:6px;opacity:.85">{s}</div></div>' for t, s in puntos)
    # los puntos se ubican sobre la curva con getPointAtLength, alternando el lado
    js = f"""const p=document.getElementById('c'),L=p.getTotalLength(),f=[.13,.38,.62,.87];
document.querySelectorAll('.pt').forEach((e,i)=>{{const q=p.getPointAtLength(L*f[i]);
const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',q.x);c.setAttribute('cy',q.y);c.setAttribute('r',8);
c.setAttribute('fill','{CREMA}');p.parentNode.appendChild(c);const der=q.x>=560;
e.style.top=(q.y-24)+'px';if(der){{e.style.left=(q.x+30)+'px';e.style.textAlign='left'}}else{{e.style.right=(1080-q.x+30)+'px';e.style.textAlign='right'}}}});"""
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="bloque som" style="top:200px"><div class="cuerpo">{intro}</div>
    <div class="caps" style="font-size:24px;line-height:1.45;margin-top:12px">{destaca}</div></div>
  <svg class="lleno" viewBox="0 0 1080 1350"><path id="c" d="{d}" fill="none" stroke="{CREMA}" stroke-opacity=".85" stroke-width="1.6"/></svg>
  {pts}""", js)


def pregunta(n, nombre, archivo, etiqueta, numero, temas, texto, sub, opciones, cierre, pos="50% 50%", op=.45):
    t = f' <span style="opacity:.5">|</span> '.join(temas)
    ops = "".join(f'<div style="display:flex;gap:22px;align-items:center;margin:22px 0"><span class="flecha-c" style="gap:0"><i style="width:46px;height:46px;font-size:19px">→</i></span>'
                  f'<span class="cuerpo" style="text-decoration:underline;text-underline-offset:7px;text-decoration-thickness:1px">{o}</span></div>' for o in opciones)
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="som" style="position:absolute;left:80px;right:80px;top:180px">
    <div class="caps" style="font-size:20px;padding-bottom:16px;border-bottom:1px solid rgba(244,240,225,.6)">{numero}</div>
    <div style="margin-top:22px;font:500 15px/1 Montserrat;letter-spacing:.2em;text-transform:uppercase"><span style="opacity:.7;margin-right:22px">Tema</span>{t}</div>
  </div>
  <div style="position:absolute;left:190px;right:190px;top:400px;border:1.5px solid {CREMA};border-radius:22px;padding:18px">
    <div style="font:500 15px/1 Montserrat;letter-spacing:.1em;text-align:center;margin-bottom:16px" class="som">Tu respuesta +</div>
    <div style="background:{CREMA};color:{VERDE};border-radius:12px;padding:30px 34px;text-align:center;font:500 27px/1.4 Montserrat">{texto}</div>
  </div>
  <div class="som" style="position:absolute;left:120px;right:120px;top:720px">
    <div class="caps oro" style="font-size:20px">{sub}</div>{ops}
    <div class="caps oro" style="font-size:20px;margin-top:34px">{cierre}</div>
    <div style="margin-top:44px"><span class="boton">Escríbenos</span></div>
  </div>""")


def texto(n, nombre, archivo, etiqueta, caps1, cursiva, caps2, palabras, pos="50% 50%", op=.38):
    p = '<span style="display:inline-block;width:40px;height:1px;background:currentColor;opacity:.7;margin:0 22px;vertical-align:middle"></span>'.join(palabras)
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta) + f"""
  <div class="bloque som" style="top:0;height:1350px;display:flex;flex-direction:column;justify-content:center;left:110px;right:110px">
    <div class="caps" style="font-size:26px;line-height:1.5">{caps1}</div>
    <div class="cur" style="font-size:34px;margin-top:26px;opacity:.92">{cursiva}</div>
    <div class="caps" style="font-size:30px;line-height:1.45;margin-top:18px;font-weight:600">{caps2}</div>
  </div>
  <div class="bloque caps som" style="bottom:110px;font-size:17px;left:60px;right:60px">{p}</div>""")


def producto(n, nombre, archivo, prods, etiqueta, titulo, detalle, precio, pos="50% 50%", op=.3):
    im = "".join(f'<img class="prod" src="{A}/productos/{p}.png" style="{e}" alt="">' for p, e in prods)
    pagina(n, nombre, fondo(archivo, pos, op, etiqueta, abajo=.75) + im + f"""
  <div class="bloque som" style="top:1065px;left:80px;right:80px">
    <div class="cur" style="font-size:80px;line-height:1">{titulo}</div>
    <div class="caps" style="font-size:17px;margin-top:20px;letter-spacing:.24em">{detalle}</div>
    <div style="margin-top:20px;font:500 30px/1 Montserrat;letter-spacing:.08em" class="oro">{precio}</div>
  </div>""")


def prod_disco(p, alto=270):
    return f'<img src="{A}/productos/{p}.png" style="height:{alto}px;filter:drop-shadow(0 10px 12px rgba(30,30,20,.3))" alt="">'


# ---- ejecutar el plan del día ---------------------------------------------
TIPOS = {"portada": portada, "lista": lista, "venn": venn, "infinito": infinito, "anillo": anillo,
         "camino": camino, "vertical": vertical, "pregunta": pregunta, "texto": texto, "producto": producto}
plan = json.loads((DIA / "plan.json").read_text(encoding="utf-8"))
TINTAR.update(plan.get("tintar", {}))  # fotos extra a llevar al tono oliva {"archivo": opacidad}
for i, pieza in enumerate(plan["piezas"], 1):
    args = dict(pieza["args"])
    if pieza["tipo"] == "anillo" and isinstance(args.get("centro"), str):
        args["centro"] = prod_disco(args["centro"])           # nombre de producto -> imagen en el disco
    if pieza["tipo"] == "producto":
        args["prods"] = [tuple(p) for p in args["prods"]]
    TIPOS[pieza["tipo"]](i, pieza["nombre"], **args)
print(len(plan["piezas"]), "piezas en", OUT)
