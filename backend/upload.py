import fitz  # PyMuPDF
import os
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

def extract_text_from_pdf(file_path: str) -> list[dict]:
    """Extract text from PDF, returns list of {page, text} dicts"""
    doc = fitz.open(file_path)
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():  # skip empty pages
            pages.append({
                "page": page_num + 1,
                "text": text
            })
    doc.close()
    return pages

def chunk_text(pages: list[dict], chunk_size: int = 500) -> list[dict]:
    """Split pages into smaller chunks for embedding"""
    chunks = []
    for page_data in pages:
        text = page_data["text"]
        words = text.split()
        
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append({
                    "text": chunk,
                    "page": page_data["page"]
                })
    return chunks