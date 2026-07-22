from __future__ import annotations

import copy
import re
import sys
import zipfile
from pathlib import Path
from lxml import etree


W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
WP = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
V = "urn:schemas-microsoft-com:vml"
XML = "http://www.w3.org/XML/1998/namespace"
NS = {"w": W, "wp": WP, "v": V}


def qn(local: str) -> str:
    return f"{{{W}}}{local}"


def box_text(box: etree._Element) -> str:
    return "".join(box.xpath(".//w:t/text()", namespaces=NS))


def paragraph_text(paragraph: etree._Element) -> str:
    return "".join(paragraph.xpath(".//w:t/text()", namespaces=NS))


def set_paragraph_text(paragraph: etree._Element, value: str) -> None:
    ppr = paragraph.find(qn("pPr"))
    first_run = paragraph.find(qn("r"))
    if first_run is None:
        run = etree.Element(qn("r"))
    else:
        run = copy.deepcopy(first_run)
        for child in list(run):
            if child.tag != qn("rPr"):
                run.remove(child)

    for child in list(paragraph):
        if child is not ppr:
            paragraph.remove(child)

    if value:
        text = etree.SubElement(run, qn("t"))
        text.set(f"{{{XML}}}space", "preserve")
        text.text = value
        paragraph.append(run)


def matching_boxes(root: etree._Element, required: list[str]) -> list[etree._Element]:
    result = []
    for box in root.xpath("//w:txbxContent", namespaces=NS):
        content = box_text(box)
        if all(token in content for token in required):
            result.append(box)
    return result


def require_count(label: str, boxes: list[etree._Element], expected: int = 2) -> None:
    if len(boxes) != expected:
        raise RuntimeError(f"{label}: expected {expected} textboxes, found {len(boxes)}")


def move_box(
    box: etree._Element,
    *,
    y_emu: int,
    fallback_margin_top_pt: float,
    cy_emu: int | None = None,
    fallback_height_pt: float | None = None,
) -> None:
    anchors = box.xpath("ancestor::wp:anchor[1]", namespaces=NS)
    if anchors:
        anchor = anchors[0]
        offsets = anchor.xpath("./wp:positionV/wp:posOffset", namespaces=NS)
        if len(offsets) != 1:
            raise RuntimeError("modern textbox anchor lacks a unique vertical offset")
        offsets[0].text = str(y_emu)
        if cy_emu is not None:
            extents = anchor.xpath("./wp:extent", namespaces=NS)
            if len(extents) != 1:
                raise RuntimeError("modern textbox anchor lacks a unique extent")
            extents[0].set("cy", str(cy_emu))
        return

    # Preserve VML fallback geometry byte-for-byte. WPS can distort the entire
    # page when an individual fallback shape is resized without rebuilding its
    # full group coordinate system. Modern Word/WPS builds use the DrawingML
    # anchor above; older fallback renderers keep the original placement.
    return


def replace_box_paragraphs(box: etree._Element, values: list[str]) -> None:
    paragraphs = box.xpath("./w:p", namespaces=NS)
    if len(paragraphs) < len(values):
        raise RuntimeError(f"textbox has {len(paragraphs)} paragraphs, needs {len(values)}")
    for paragraph, value in zip(paragraphs, values):
        set_paragraph_text(paragraph, value)
    for paragraph in paragraphs[len(values):]:
        box.remove(paragraph)


def patch_identity(root: etree._Element) -> None:
    boxes = matching_boxes(root, ["出生年月", "学校住址", "家庭住址"])
    require_count("identity", boxes)
    values = [
        "电    话：131-6621-5858",
        "邮    箱：wuhaotian@sjtu.edu.cn",
        "GitHub：github.com/wuhaotian0508",
        "研究方向：LLM Agents / RAG / AI4Science",
    ]
    for box in boxes:
        replace_box_paragraphs(box, values)


def patch_education(root: etree._Element) -> None:
    boxes = matching_boxes(root, ["2024.09-在读", "上海交通大学附属中学"])
    require_count("education", boxes)
    values = [
        "2026.07–2026.08        UC Berkeley        Berkeley Summer Sessions",
        "Visiting International Student；目前在读。",
        "2024.09–至今        上海交通大学        人工智能（拔尖英才试点班，本科）",
        "学积分：大一 89.7（18/66）；大二上学期 95.3（3/65）。",
        "核心课程：数学分析、线性代数、概率论、算法设计与分析、人工智能、数据结构、图论与组合。",
    ]
    for box in boxes:
        all_paragraphs = box.xpath("./w:p", namespaces=NS)
        original = [p for p in all_paragraphs if paragraph_text(p).strip()]
        if len(original) != 4:
            raise RuntimeError(f"education: expected 4 source paragraphs, found {len(original)}")
        header_ucb = copy.deepcopy(original[0])
        bullet_ucb = copy.deepcopy(original[1])
        header_sjtu = copy.deepcopy(original[3])
        bullet_scores = copy.deepcopy(original[1])
        bullet_courses = copy.deepcopy(original[2])
        new_paragraphs = [header_ucb, bullet_ucb, header_sjtu, bullet_scores, bullet_courses]
        for paragraph, value in zip(new_paragraphs, values):
            set_paragraph_text(paragraph, value)
        for paragraph in all_paragraphs:
            box.remove(paragraph)
        for paragraph in new_paragraphs:
            box.append(paragraph)


def patch_projects(root: etree._Element) -> None:
    boxes = matching_boxes(root, ["NutriMaster", "SantaClaus", "EvoMaster"])
    require_count("projects", boxes)
    values = [
        "NutriMaster 植物基因智能问答系统｜Lead Developer",
        "主导设计并上线面向植物营养与基因研究的科研 Agent 平台，构建覆盖文献抽取、事实校验、增量建库、多源检索、智能问答与评测回归的完整工作流。融合 PubMed、结构化基因库、用户私有 PDF 与 Graph RAG，采用向量检索、BM25 和字段关键词混合召回；系统已上线，GitHub：github.com/wuhaotian0508/NutriMaster。",
        "SantaClaus 自进化 AI4Science 科研智能体｜独立开发（Python）",
        "基于 EvoMaster 构建 Planner–Executor–Debugger–Grader–Skill Extraction 多智能体流水线，支持任务拆解、并行实验、失败自修复、模型评估与经验沉淀；已在 Kaggle 机器学习任务上验证，GitHub：github.com/wuhaotian0508/SantaClaus。",
    ]
    for box in boxes:
        replace_box_paragraphs(box, values)


def patch_publications(root: etree._Element) -> None:
    headers = matching_boxes(root, ["社会实践"])
    require_count("publication header", headers)
    for box in headers:
        replace_box_paragraphs(box, ["科研论文"])
        move_box(box, y_emu=5838190, fallback_margin_top_pt=459.70)

    boxes = matching_boxes(root, ["牛津大学OPP", "创新大赛志愿者"])
    require_count("publication content", boxes)
    values = [
        "OSOR: One-Step Diffusion Inpainting for Effect-Aware Object Removal，ECCV 2026 录用，共同作者，第 7/9 作者。",
        "DataMaster: Towards Autonomous Data Engineering for Machine Learning，arXiv:2605.10906，2026，共同作者，第 8/15 作者。",
    ]
    for box in boxes:
        replace_box_paragraphs(box, values)
        move_box(
            box,
            y_emu=6076950,
            fallback_margin_top_pt=478.50,
            cy_emu=1100000,
            fallback_height_pt=86.60,
        )


def patch_honors(root: etree._Element) -> None:
    headers = matching_boxes(root, ["荣誉证书"])
    require_count("honors header", headers)
    for box in headers:
        replace_box_paragraphs(box, ["荣誉竞赛"])

    boxes = matching_boxes(root, ["致远荣誉奖学金", "MCMMCM/ICM", "数学奥林匹克"])
    require_count("honors content", boxes)
    values = [
        "2025 年度致远荣誉奖学金；",
        "2024–2025 学年本科生 C 等优秀奖学金；",
        "2023 年全国中学生数学奥林匹克竞赛省级二等奖。",
    ]
    for box in boxes:
        replace_box_paragraphs(box, values)


def patch_skills(root: etree._Element) -> None:
    headers = matching_boxes(root, ["自我评价"])
    require_count("skills header", headers)
    for box in headers:
        replace_box_paragraphs(box, ["专业技能"])

    boxes = matching_boxes(root, ["TOFEL 5.5", "vibe coding", "Python"])
    require_count("skills content", boxes)
    values = [
        "技术：Python、LaTeX；具备 LLM Agent、RAG / Graph RAG 与评测回归开发经验；",
        "研究方向：LLM Agents、AI4Science、强化学习与自动化科研；",
        "英语：CET-4 673，CET-6 612；具备英文论文阅读、写作与交流能力；",
        "工程：具备独立开发、系统部署、多智能体编排与科研平台建设经验。",
    ]
    for box in boxes:
        replace_box_paragraphs(box, values)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build_resume.py INPUT.docx OUTPUT.docx")
    source = Path(sys.argv[1])
    output = Path(sys.argv[2])

    with zipfile.ZipFile(source, "r") as zf:
        parts = {info.filename: zf.read(info.filename) for info in zf.infolist()}
        infos = {info.filename: info for info in zf.infolist()}

    root = etree.fromstring(parts["word/document.xml"])
    patch_identity(root)
    patch_education(root)
    patch_projects(root)
    patch_publications(root)
    patch_honors(root)
    patch_skills(root)
    parts["word/document.xml"] = etree.tostring(
        root, xml_declaration=True, encoding="UTF-8", standalone=True
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output, "w") as zf:
        for name, data in parts.items():
            source_info = infos[name]
            new_info = zipfile.ZipInfo(name, date_time=source_info.date_time)
            new_info.compress_type = source_info.compress_type
            new_info.comment = source_info.comment
            new_info.extra = source_info.extra
            new_info.internal_attr = source_info.internal_attr
            new_info.external_attr = source_info.external_attr
            new_info.create_system = source_info.create_system
            zf.writestr(new_info, data)

    print(output)


if __name__ == "__main__":
    main()
