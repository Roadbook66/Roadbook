"""Roadbook — prépare nos photos pour l'application.
Usage : python3 outils/signer-photos.py ORIGINAL.jpg images/nos-photos/nom.jpg
Réduit à 1400 px, ajoute « © Déborah » en bas à droite, retire les données cachées
(dont la position GPS) et inscrit le copyright dans le fichier."""
import sys
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter
POLICE = "/usr/share/fonts/opentype/inter/Inter-Medium.otf"
def signer(src, dst, texte="© Déborah"):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB"); im.thumbnail((1400, 1400))
    W, H = im.size; sz = max(18, int(min(W, H) * 0.032))
    try: f = ImageFont.truetype(POLICE, sz)
    except OSError: f = ImageFont.load_default()
    l, tp, r, b = f.getbbox(texte); mg = int(sz * 0.9); x = W - (r - l) - mg; y = H - (b - tp) - mg - tp
    o = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(o).text((x, y + 1), texte, font=f, fill=(0, 0, 0, 110))
    o = o.filter(ImageFilter.GaussianBlur(max(1, sz // 10)))
    c = Image.new("RGBA", im.size, (0, 0, 0, 0)); ImageDraw.Draw(c).text((x, y), texte, font=f, fill=(255, 255, 255, 200))
    out = Image.alpha_composite(Image.alpha_composite(im.convert("RGBA"), o), c).convert("RGB")
    ex = Image.Exif(); ex[0x8298] = "Copyright Deborah - tous droits reserves"; ex[0x013B] = "Deborah"
    out.save(dst, quality=80, optimize=True, progressive=True, exif=ex.tobytes())
if __name__ == "__main__":
    signer(sys.argv[1], sys.argv[2])
