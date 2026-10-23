عرض الشرائح (PowerPoint)

مجلد `slides/` يحتوي:

- `slide_content.md` — المحتوى العربي للشرائح مفصول بــ `---` لكل شريحة.
- `generate_pptx.py` — سكربت Python يحوّل `slide_content.md` إلى `Medico_Presentation.pptx`.

تشغيل محلي:

1. تأكد لديك Python 3.8+ ثم ثبّت المتطلّب:

```bash
pip install python-pptx
```

2. شغّل السكربت داخل المجلد `slides`:

```bash
python generate_pptx.py
```

3. سينتج ملف `Medico_Presentation.pptx` جاهزًّا للتحميل أو العرض.

ملاحظة: إن أردت أعدّ لك ملف `.pptx` هنا مباشرة وأرفعه، أو أصنع نسخة Google Slides، قل لي وأنفّذ.
