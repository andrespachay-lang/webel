# MCP de CapCut (VectCutAPI)

El repo incluye en `.mcp.json` un servidor MCP llamado `capcut`. Con él, Claude Code puede crear borradores de CapCut con video, audio, imágenes, texto, subtítulos, efectos, stickers y keyframes, y guardarlos directamente en la carpeta de borradores de CapCut.

CapCut no tiene API pública ni MCP oficial. Este servidor usa [VectCutAPI](https://github.com/sun-guannan/VectCutAPI), un proyecto open source (Apache-2.0) que genera los archivos de borrador de CapCut. **Solo funciona en tu ordenador**, con CapCut de escritorio instalado. No funciona en sesiones de Claude Code en la nube.

## Requisitos

- CapCut de escritorio (versión internacional) o Jianying
- Python 3.10 o superior
- FFmpeg

## Instalación (una sola vez)

```bash
# Clónalo fuera de este repo, por ejemplo en tu carpeta personal
git clone https://github.com/sun-guannan/VectCutAPI.git ~/VectCutAPI
cd ~/VectCutAPI

python3 -m venv venv-capcut
source venv-capcut/bin/activate          # Windows: venv-capcut\Scripts\activate
pip install -r requirements.txt -r requirements-mcp.txt

cp config.json.example config.json       # deja "draft_profile": "capcut_legacy" para CapCut
```

## Variables de entorno

`.mcp.json` no guarda rutas de tu máquina; las lee de estas variables:

| Variable | Valor | Obligatoria |
|---|---|---|
| `VECTCUT_DIR` | Ruta absoluta del clon, p. ej. `/Users/tu-usuario/VectCutAPI` | Sí |
| `VECTCUT_PYTHON` | Python del entorno virtual, p. ej. `/Users/tu-usuario/VectCutAPI/venv-capcut/bin/python` | Recomendada (por defecto se usa `python3`) |

macOS / Linux (añádelo a `~/.zshrc` o `~/.bashrc`):

```bash
export VECTCUT_DIR="$HOME/VectCutAPI"
export VECTCUT_PYTHON="$VECTCUT_DIR/venv-capcut/bin/python"
```

Windows (PowerShell):

```powershell
setx VECTCUT_DIR "C:\Users\tu-usuario\VectCutAPI"
setx VECTCUT_PYTHON "C:\Users\tu-usuario\VectCutAPI\venv-capcut\Scripts\python.exe"
```

## Uso

1. Abre Claude Code en la raíz de este repo. La primera vez te pedirá que apruebes el servidor `capcut` del proyecto.
2. Comprueba que está conectado con `/mcp`.
3. Pídele algo como: *"Crea un borrador de CapCut 1080x1920 con el video de bienvenida del hotel, el título «Estación del Sol» y música de fondo, y guárdalo como «Promo Spondylus»"*.
4. Abre CapCut: el proyecto aparece en tus borradores. Si no aparece, cierra CapCut y vuelve a abrirlo.

Herramientas disponibles: `create_draft`, `add_video`, `add_audio`, `add_image`, `add_text`, `add_subtitle`, `add_effect`, `add_sticker`, `add_video_keyframe`, `get_video_duration` y `save_draft`.

## Problemas comunes

- **`capcut` aparece como "failed" en `/mcp`**: revisa que `VECTCUT_DIR` esté definida en la terminal desde la que abres Claude Code. Después prueba el servidor a mano con `cd $VECTCUT_DIR && $VECTCUT_PYTHON test_mcp_client.py`; debería decir que encontró 11 herramientas.
- **El borrador no aparece en CapCut**: cierra CapCut antes de guardar, porque su autoguardado puede sobrescribir los cambios. También puedes pasar `draft_folder` a `save_draft` con la ruta de borradores de CapCut.
