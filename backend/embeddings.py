import chromadb
from sentence_transformers import SentenceTransformer
from pathlib import Path

# Initialize ChromaDB - stores data locally in a folder
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Load embedding model - downloads once, cached after that
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

def get_or_create_collection(doc_name: str):
    """Get existing collection or create new one for a document"""
    # ChromaDB collection name must be alphanumeric
    collection_name = doc_name.replace(".pdf", "").replace(" ", "_").lower()
    collection = chroma_client.get_or_create_collection(name=collection_name)
    return collection

def embed_and_store(chunks: list[dict], doc_name: str) -> int:
    """Embed chunks and store in ChromaDB"""
    collection = get_or_create_collection(doc_name)
    
    texts = [chunk["text"] for chunk in chunks]
    pages = [chunk["page"] for chunk in chunks]
    
    # Generate embeddings
    embeddings = embedding_model.encode(texts).tolist()
    
    # Store in ChromaDB
    collection.add(
        documents=texts,
        embeddings=embeddings,
        metadatas=[{"page": p, "doc": doc_name} for p in pages],
        ids=[f"{doc_name}_chunk_{i}" for i in range(len(texts))]
    )
    
    return len(texts)

def search_similar_chunks(query: str, doc_name: str, n_results: int = 5) -> list[dict]:
    """Find most relevant chunks for a query"""
    collection = get_or_create_collection(doc_name)
    
    # Embed the query
    query_embedding = embedding_model.encode([query]).tolist()
    
    # Search ChromaDB
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results
    )
    
    # Format results
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "page": results["metadatas"][0][i]["page"],
            "doc": results["metadatas"][0][i]["doc"]
        })
    
    return chunks