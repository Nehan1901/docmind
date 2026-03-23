import anthropic
import os
from dotenv import load_dotenv
from embeddings import search_similar_chunks
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent / ".env")
load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def ask_document(question: str, doc_name: str) -> dict:
    """Query ChromaDB for relevant chunks then ask Claude"""
    
    # Step 1: Find relevant chunks from ChromaDB
    relevant_chunks = search_similar_chunks(question, doc_name)
    
    if not relevant_chunks:
        return {
            "answer": "No relevant information found in the document.",
            "sources": []
        }
    
    # Step 2: Build context from chunks
    context = ""
    for chunk in relevant_chunks:
        context += f"\n[Page {chunk['page']}]:\n{chunk['text']}\n"
    
    # Step 3: Ask Claude with the context
    prompt = f"""You are a helpful document assistant. 
Answer the user's question based ONLY on the document context provided below.
Always mention which page(s) your answer comes from.
If the answer is not in the context, say "I couldn't find that in the document."

Document context:
{context}

User question: {question}

Answer:"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    
    # Step 4: Return answer + sources
    return {
        "answer": message.content[0].text,
        "sources": [
            {"page": c["page"], "doc": c["doc"]} 
            for c in relevant_chunks
        ]
    }