# Resume template execution contract

## Reference

- Source: `D:\桌面\clothes-choosing\work\staging\resume.docx`
- SHA-256: `BD90D097593A97DFDA0E961E18DAE18BE9626E376AF8198F5ACCE784295ADFD1`
- Length: 90,437 bytes
- Pages: 1
- Sections: 1
- Visual evidence: `C:\Users\wuhao\.codex\visualizations\2026\07\16\019f6989-9326-7ec0-8585-0851dd1a554a\resume_page-1.png`
- Style evidence: `D:\桌面\clothes-choosing\work\resume_style_evidence.json`

## Page system

- A4 portrait, 8.27 x 11.69 inches.
- Margins: 0.50 inch on all sides.
- One section, no distinct first-page header/footer behavior.
- Content is a single-page composition of anchored DrawingML shapes with VML fallbacks.
- All existing drawing anchors, page geometry, photo placement, blue banner shapes, rules, and left vertical guide are preserve-only.

## Visual system

- Blue/white Chinese student-resume template.
- Primary blue: `#5F73B2`.
- Main typeface: Microsoft YaHei.
- Name: large blue display text at upper left.
- Section labels: white bold text, approximately 12 pt, centered in blue rectangular tabs with pointed left decoration.
- Body text: dark gray/black, approximately 10 pt; section content uses compact bullets and exact/auto line spacing.
- Existing ID photo, `RESUME` badge, horizontal blue rules, and overall single-page hierarchy must remain visually unchanged.

## Content flow and slot map

1. Identity block: preserve name/photo; replace birth date and addresses with phone, email, GitHub, and research interests.
2. Education header: preserve label and position.
3. Education content textbox: replace high-school row with UC Berkeley Summer Sessions and retain a condensed SJTU record; adding one cloned bullet paragraph is permitted if the box still fits.
4. Project header: preserve label and position.
5. Project content textbox: retain NutriMaster and SantaClaus, but shorten each to one title paragraph plus one evidence-focused description.
6. Social-practice header/content: repurpose in place as `科研论文`; two compact publication entries only.
7. Honors header/content: rename to `荣誉与竞赛`; retain scholarships and mathematics olympiad; remove participation-only MCM/ICM wording.
8. Self-evaluation header/content: repurpose as `技能与语言`; retain only verifiable skills, research interests, and CET scores; remove subjective evaluation and the ambiguous `TOFEL 5.5` claim.

## Package preservation

- Editable package part: `word/document.xml` only.
- Preserve byte-for-byte: `[Content_Types].xml`, all relationships, `customXml/*`, `docProps/*`, `word/fontTable.xml`, `word/media/*`, `word/numbering.xml`, `word/settings.xml`, `word/styles.xml`, and `word/theme/*`.
- Within `word/document.xml`, only text nodes and paragraph content inside the mapped textboxes may change. Existing drawings, anchors, extents, shape geometry, image relationships, and section properties must remain unchanged.
- Both DrawingML `mc:Choice` textbox content and VML `mc:Fallback` textbox content must receive equivalent text changes.

## Fidelity gates

- Final source remains one A4 page.
- Blue banners, portrait, name, badge, rules, and vertical guide retain their positions and colors.
- No overlapping textboxes or clipping after the UCB and publication additions.
- Every mapped slot has equivalent content in modern and fallback representations.
- All package parts except `word/document.xml` match the reference by SHA-256.
