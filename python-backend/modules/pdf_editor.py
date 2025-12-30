"""
PDF Editor Module - Desktop PDF Annotation Tool
Provides backend functionality for editing PDFs with annotations (text, shapes, highlights, comments)
"""

import logging
import os
import io
import base64
import json
import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


def get_pdf_info(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get PDF document information (page count, dimensions, etc.)

    Args:
        payload: {
            "file": "path/to/pdf.pdf"
        }

    Returns:
        {
            "page_count": int,
            "pages": [
                {"page_num": 1, "width": float, "height": float, "rotation": int},
                ...
            ]
        }
    """
    file_path = payload.get("file")

    if not file_path or not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    try:
        doc = fitz.open(file_path)

        pages_info = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            rect = page.rect
            pages_info.append({
                "page_num": page_num + 1,  # 1-indexed for display
                "width": rect.width,
                "height": rect.height,
                "rotation": page.rotation
            })

        doc.close()

        return {
            "page_count": len(pages_info),
            "pages": pages_info
        }

    except Exception as e:
        logger.error(f"Error getting PDF info: {e}", exc_info=True)
        return {"error": str(e)}


def render_pdf_page(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Render a specific PDF page to base64-encoded PNG image

    Args:
        payload: {
            "file": "path/to/pdf.pdf",
            "page": 0,  # 0-indexed
            "dpi": 150  # optional, default 150
        }

    Returns:
        {
            "image": "data:image/png;base64,...",
            "width": int,
            "height": int,
            "page_width": float,  # PDF points
            "page_height": float  # PDF points
        }
    """
    file_path = payload.get("file")
    page_num = payload.get("page", 0)
    dpi = payload.get("dpi", 150)

    if not file_path or not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    try:
        doc = fitz.open(file_path)

        if page_num < 0 or page_num >= len(doc):
            doc.close()
            return {"error": f"Invalid page number: {page_num} (PDF has {len(doc)} pages)"}

        page = doc[page_num]

        # Get page dimensions in PDF points
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height

        # Render page to pixmap at specified DPI
        # DPI 72 = 1:1 scale (PDF point = 1 pixel)
        # DPI 150 = 2.08x scale (higher quality)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        # Convert to PNG bytes
        png_bytes = pix.tobytes("png")

        # Encode to base64
        base64_image = base64.b64encode(png_bytes).decode('utf-8')
        data_url = f"data:image/png;base64,{base64_image}"

        doc.close()

        return {
            "image": data_url,
            "width": pix.width,
            "height": pix.height,
            "page_width": page_width,
            "page_height": page_height,
            "dpi": dpi,
            "zoom": zoom
        }

    except Exception as e:
        logger.error(f"Error rendering PDF page: {e}", exc_info=True)
        return {"error": str(e)}


def load_annotations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Load existing annotations from a PDF file

    Args:
        payload: {
            "file": "path/to/pdf.pdf"
        }

    Returns:
        {
            "annotations": [
                {
                    "id": str,
                    "page": int,
                    "type": str,  # "text", "highlight", "rect", "circle", "comment"
                    "rect": {"x": float, "y": float, "width": float, "height": float},
                    "text": str,  # for text/comment annotations
                    "color": str,  # hex color
                    "opacity": float,
                    "fontSize": int,  # for text annotations
                    ...
                },
                ...
            ]
        }
    """
    file_path = payload.get("file")

    if not file_path or not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    try:
        doc = fitz.open(file_path)

        all_annotations = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            annots = page.annots()

            if not annots:
                continue

            for annot in annots:
                try:
                    annot_dict = {
                        "id": f"annot_{page_num}_{annot.type[0]}_{len(all_annotations)}",
                        "page": page_num,
                        "type": _map_annot_type(annot.type[0]),
                        "rect": _rect_to_dict(annot.rect)
                    }

                    # Get annotation properties based on type
                    if annot.type[0] == fitz.PDF_ANNOT_FREE_TEXT:
                        # Text annotation
                        info = annot.info
                        annot_dict["text"] = info.get("content", "")
                        annot_dict["fontSize"] = annot.fontsize or 12
                        annot_dict["color"] = _color_to_hex(annot.colors.get("stroke", (0, 0, 0)))

                    elif annot.type[0] == fitz.PDF_ANNOT_HIGHLIGHT:
                        # Highlight annotation
                        annot_dict["color"] = _color_to_hex(annot.colors.get("stroke", (1, 1, 0)))
                        annot_dict["opacity"] = annot.opacity or 0.5

                    elif annot.type[0] in [fitz.PDF_ANNOT_SQUARE, fitz.PDF_ANNOT_CIRCLE]:
                        # Shape annotations
                        annot_dict["color"] = _color_to_hex(annot.colors.get("stroke", (0, 0, 0)))
                        annot_dict["fillColor"] = _color_to_hex(annot.colors.get("fill"))
                        annot_dict["strokeWidth"] = annot.border.get("width", 1)

                    elif annot.type[0] == fitz.PDF_ANNOT_TEXT:
                        # Comment/note annotation
                        info = annot.info
                        annot_dict["text"] = info.get("content", "")
                        annot_dict["icon"] = annot.info.get("name", "Comment")

                    all_annotations.append(annot_dict)

                except Exception as e:
                    logger.warning(f"Error reading annotation: {e}")
                    continue

        doc.close()

        return {"annotations": all_annotations}

    except Exception as e:
        logger.error(f"Error loading annotations: {e}", exc_info=True)
        return {"error": str(e)}


def save_annotations(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save annotations to a PDF file

    Args:
        payload: {
            "file": "path/to/input.pdf",
            "output": "path/to/output.pdf",
            "annotations": [
                {
                    "page": int,
                    "type": str,  # "text", "highlight", "rect", "circle", "comment"
                    "x": float,  # PDF coordinates
                    "y": float,
                    "width": float,
                    "height": float,
                    "text": str,
                    "color": str,  # hex
                    "opacity": float,
                    "fontSize": int,
                    ...
                },
                ...
            ],
            "flatten": false  # optional, default false
        }

    Returns:
        {
            "output_file": str,
            "annotations_added": int
        }
    """
    file_path = payload.get("file")
    output_path = payload.get("output")
    annotations = payload.get("annotations", [])
    flatten = payload.get("flatten", False)

    if not file_path or not os.path.exists(file_path):
        return {"error": f"File not found: {file_path}"}

    if not output_path:
        base, ext = os.path.splitext(file_path)
        output_path = f"{base}_annotated{ext}"

    try:
        doc = fitz.open(file_path)

        annotations_added = 0

        for annot_data in annotations:
            try:
                page_num = annot_data.get("page", 0)

                if page_num < 0 or page_num >= len(doc):
                    logger.warning(f"Invalid page number: {page_num}")
                    continue

                page = doc[page_num]

                # Create rectangle from coordinates
                rect = fitz.Rect(
                    annot_data.get("x", 0),
                    annot_data.get("y", 0),
                    annot_data.get("x", 0) + annot_data.get("width", 100),
                    annot_data.get("y", 0) + annot_data.get("height", 50)
                )

                annot_type = annot_data.get("type", "text")

                # Add annotation based on type
                if annot_type == "text":
                    # FreeText annotation
                    text = annot_data.get("text", "Text")
                    font_size = annot_data.get("fontSize", 12)
                    font_family = annot_data.get("fontFamily", "Arial")
                    color = _hex_to_color(annot_data.get("color", "#000000"))

                    # Map web font to PDF font name
                    font_map = {
                        'Arial': 'helv',
                        'Verdana': 'helv',
                        'Times New Roman': 'times',
                        'Georgia': 'times',
                        'Courier New': 'cour'
                    }
                    pdf_font = font_map.get(font_family, 'helv')

                    annot = page.add_freetext_annot(
                        rect,
                        text,
                        fontname=pdf_font,
                        fontsize=font_size,
                        text_color=color,
                        fill_color=(1, 1, 1),  # White background
                        border_color=color
                    )
                    annotations_added += 1

                elif annot_type == "highlight":
                    # Highlight annotation
                    color = _hex_to_color(annot_data.get("color", "#FFFF00"))
                    opacity = annot_data.get("opacity", 0.5)

                    annot = page.add_highlight_annot(rect)
                    annot.set_colors(stroke=color)
                    annot.set_opacity(opacity)
                    annot.update()
                    annotations_added += 1

                elif annot_type == "rect":
                    # Rectangle annotation
                    color = _hex_to_color(annot_data.get("color", "#000000"))
                    fill_color = _hex_to_color(annot_data.get("fillColor")) if annot_data.get("fillColor") else None
                    stroke_width = annot_data.get("strokeWidth", 1)

                    annot = page.add_rect_annot(rect)
                    annot.set_colors(stroke=color, fill=fill_color)
                    annot.set_border(width=stroke_width)
                    annot.update()
                    annotations_added += 1

                elif annot_type == "circle":
                    # Circle annotation
                    color = _hex_to_color(annot_data.get("color", "#000000"))
                    fill_color = _hex_to_color(annot_data.get("fillColor")) if annot_data.get("fillColor") else None
                    stroke_width = annot_data.get("strokeWidth", 1)

                    annot = page.add_circle_annot(rect)
                    annot.set_colors(stroke=color, fill=fill_color)
                    annot.set_border(width=stroke_width)
                    annot.update()
                    annotations_added += 1

                elif annot_type == "comment":
                    # Text/Note annotation (popup)
                    text = annot_data.get("text", "Comment")
                    point = fitz.Point(annot_data.get("x", 0), annot_data.get("y", 0))

                    annot = page.add_text_annot(point, text)
                    annotations_added += 1

            except Exception as e:
                logger.warning(f"Error adding annotation: {e}")
                continue

        # Flatten annotations if requested (makes them permanent, non-editable)
        if flatten:
            for page_num in range(len(doc)):
                page = doc[page_num]
                # This bakes annotations into the page content
                page.apply_redactions()

        # Save the PDF
        doc.save(output_path, garbage=4, deflate=True)
        doc.close()

        logger.info(f"Saved {annotations_added} annotations to {output_path}")

        return {
            "output_file": output_path,
            "annotations_added": annotations_added
        }

    except Exception as e:
        logger.error(f"Error saving annotations: {e}", exc_info=True)
        return {"error": str(e)}


# Helper functions

def _map_annot_type(pymupdf_type: int) -> str:
    """Map PyMuPDF annotation type to our simplified type"""
    mapping = {
        fitz.PDF_ANNOT_FREE_TEXT: "text",
        fitz.PDF_ANNOT_HIGHLIGHT: "highlight",
        fitz.PDF_ANNOT_SQUARE: "rect",
        fitz.PDF_ANNOT_CIRCLE: "circle",
        fitz.PDF_ANNOT_TEXT: "comment",
        fitz.PDF_ANNOT_LINE: "line",
        fitz.PDF_ANNOT_POLYGON: "polygon",
        fitz.PDF_ANNOT_POLYLINE: "polyline"
    }
    return mapping.get(pymupdf_type, "unknown")


def _rect_to_dict(rect: fitz.Rect) -> Dict[str, float]:
    """Convert PyMuPDF Rect to dictionary"""
    return {
        "x": rect.x0,
        "y": rect.y0,
        "width": rect.width,
        "height": rect.height
    }


def _color_to_hex(color: Optional[Tuple[float, float, float]]) -> str:
    """Convert RGB tuple (0-1 range) to hex color"""
    if not color:
        return "#000000"

    r = int(color[0] * 255)
    g = int(color[1] * 255)
    b = int(color[2] * 255)

    return f"#{r:02x}{g:02x}{b:02x}"


def _hex_to_color(hex_color: str) -> Tuple[float, float, float]:
    """Convert hex color to RGB tuple (0-1 range)"""
    hex_color = hex_color.lstrip("#")

    if len(hex_color) == 6:
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        return (r, g, b)

    # Default to black
    return (0.0, 0.0, 0.0)


def handle_pdf_editor_action(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main dispatcher for PDF editor actions
    """
    logger.info(f"PDF Editor action: {action}")

    if action == "get_info":
        return get_pdf_info(payload)
    elif action == "render_page":
        return render_pdf_page(payload)
    elif action == "load_annotations":
        return load_annotations(payload)
    elif action == "save_annotations":
        return save_annotations(payload)
    else:
        return {"error": f"Unknown action: {action}"}
