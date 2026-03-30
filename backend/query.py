import os
import json
from pathlib import Path
from typing import Generator

import anthropic
from dotenv import load_dotenv

from embeddings import search_similar_chunks

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def _build_prompt_and_sources(question: str, doc_name: str) -> tuple[str | None, list[dict]]:
    """Build the prompt and source metadata from retrieved chunks."""

    relevant_chunks = search_similar_chunks(question, doc_name)

    if not relevant_chunks:
        return None, []

    context = ""
    for chunk in relevant_chunks:
        context += f"\n[Page {chunk['page']}]:\n{chunk['text']}\n"

    prompt = f"""You are a helpful document assistant. 
Answer the user's question based ONLY on the document context provided below.
Always mention which page(s) your answer comes from.
If the answer is not in the context, say "I couldn't find that in the document."

Document context:
{context}

User question: {question}

Answer:"""

    sources = [{"page": c["page"], "doc": c["doc"]} for c in relevant_chunks]
    return prompt, sources


def _format_sse_data(data: str) -> str:
    lines = data.splitlines() or [""]
    return "".join(f"data: {line}\n" for line in lines) + "\n"


def ask_document(question: str, doc_name: str) -> dict:
    """Query ChromaDB for relevant chunks then ask Claude."""

    prompt, sources = _build_prompt_and_sources(question, doc_name)
    if not prompt:
        return {
            "answer": "No relevant information found in the document.",
            "sources": [],
        }

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )

    return {
        "answer": message.content[0].text,
        "sources": sources,
    }


def stream_document(question: str, doc_name: str) -> Generator[str, None, None]:
    """Stream Claude output as server-sent events."""

    prompt, sources = _build_prompt_and_sources(question, doc_name)
    if not prompt:
        yield _format_sse_data("No relevant information found in the document.")
        yield _format_sse_data(f"[SOURCES]{json.dumps({'sources': []})}")
        yield _format_sse_data("[DONE]")
        return

    with client.messages.stream(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text in stream.text_stream:
            if text:
                yield _format_sse_data(text)

    yield _format_sse_data(f"[SOURCES]{json.dumps({'sources': sources})}")
    yield _format_sse_data("[DONE]")
