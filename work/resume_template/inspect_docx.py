from __future__ import annotations

import sys
import zipfile
from pathlib import Path
from lxml import etree


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "v": "urn:schemas-microsoft-com:vml",
}


def text(node: etree._Element) -> str:
    return "".join(node.xpath(".//w:t/text()", namespaces=NS))


def main() -> None:
    path = Path(sys.argv[1])
    with zipfile.ZipFile(path) as zf:
        root = etree.fromstring(zf.read("word/document.xml"))

    for index, box in enumerate(root.xpath("//w:txbxContent", namespaces=NS), 1):
        content = " | ".join(
            part.strip()
            for part in (text(p) for p in box.xpath("./w:p", namespaces=NS))
            if part.strip()
        )
        if not content:
            continue
        anchor = box.xpath("ancestor::wp:anchor[1]", namespaces=NS)
        y = ""
        if anchor:
            vals = anchor[0].xpath("./wp:positionV/wp:posOffset/text()", namespaces=NS)
            y = vals[0] if vals else ""
            ext = anchor[0].xpath("./wp:extent", namespaces=NS)
            cy = ext[0].get("cy", "") if ext else ""
            extra = f"cy={cy}"
        else:
            groups = box.xpath("ancestor::v:group[1]", namespaces=NS)
            shapes = box.xpath("ancestor::v:shape[1]", namespaces=NS)
            style = groups[0].get("style", "") if groups else (shapes[0].get("style", "") if shapes else "")
            extra = f"vml={style}"
        print(f"{index:02d}\ty={y}\t{extra}\t{content}")


if __name__ == "__main__":
    main()
