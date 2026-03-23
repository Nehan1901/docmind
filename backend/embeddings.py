import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Uses chromadb's default embedding — no extra packages needed
default_ef = embedding_functions.DefaultEmbeddingFunction()

def get_or_create_collection(doc_name: str):
    collection_name = doc_name.replace(".pdf", "").replace(" ", "_").lower()[:50]
    collection_name = "".join(c for c in collection_name if c.isalnum() or c == "_")
    if not collection_name:
        collection_name = "default"
    return chroma_client.get_or_create_collection(
        name=collection_name,
        embedding_function=default_ef
    )

def embed_and_store(chunks: list[dict], doc_name: str) -> int:
    collection = get_or_create_collection(doc_name)
    texts = [chunk["text"] for chunk in chunks]
    pages = [chunk["page"] for chunk in chunks]
    collection.add(
        documents=texts,
        metadatas=[{"page": p, "doc": doc_name} for p in pages],
        ids=[f"{doc_name}_chunk_{i}" for i in range(len(texts))]
    )
    return len(texts)

def search_similar_chunks(query: str, doc_name: str, n_results: int = 5) -> list[dict]:
    collection = get_or_create_collection(doc_name)
    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count() or 1)
    )
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "page": results["metadatas"][0][i]["page"],
            "doc": results["metadatas"][0][i]["doc"]
        })
    return chunks