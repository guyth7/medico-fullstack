"""
Small script to generate a PPTX from `slide_content.md`.
Requires: python 3.8+ and python-pptx
Usage: python generate_pptx.py
Output: slides.pptx in the same folder
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pathlib import Path

MD = Path(__file__).parent / 'slide_content.md'
OUT = Path(__file__).parent / 'Medico_Presentation.pptx'

def parse_slides(md_text):
    parts = [p.strip() for p in md_text.split('\n---\n') if p.strip()]
    slides = []
    for part in parts:
        lines = [l.rstrip() for l in part.splitlines() if l.strip()]
        if not lines: continue
        title = lines[0].lstrip('# ').strip()
        body_lines = [l for l in lines[1:]]
        slides.append((title, body_lines))
    return slides


def make_pptx(slides):
    prs = Presentation()
    prs.slide_width = Inches(13)
    prs.slide_height = Inches(7.5)
    for title, body in slides:
        slide = prs.slides.add_slide(prs.slide_layouts[5])
        left = Inches(0.7)
        top = Inches(0.6)
        width = Inches(11.6)
        height = Inches(1.2)
        title_box = slide.shapes.add_textbox(left, top, width, height)
        tf = title_box.text_frame
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(32)
        p.font.bold = True

        body_top = Inches(1.8)
        body_box = slide.shapes.add_textbox(left, body_top, width, Inches(5))
        btf = body_box.text_frame
        for line in body:
            if line.startswith('-'):
                txt = line.lstrip('- ').strip()
                p = btf.add_paragraph()
                p.level = 0
                p.text = f"• {txt}"
                p.font.size = Pt(20)
            else:
                p = btf.add_paragraph()
                p.text = line
                p.font.size = Pt(20)
    prs.save(str(OUT))
    return OUT


def main():
    if not MD.exists():
        print('slide_content.md not found')
        return
    text = MD.read_text(encoding='utf-8')
    slides = parse_slides(text)
    out = make_pptx(slides)
    print(f'Generated PPTX: {out}')

if __name__ == '__main__':
    main()
