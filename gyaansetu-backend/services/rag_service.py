"""
GyaanSetu AI — ChromaDB RAG Service
Vector-based Retrieval-Augmented Generation using MiniLM embeddings.
Each user gets their own ChromaDB collection for private knowledge isolation.
"""

import os, uuid, logging, re
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("gyaansetu.rag")

CHROMA_PATH = os.getenv("CHROMADB_PATH", "./chroma_store")
EMBED_MODEL = "all-MiniLM-L6-v2"

_chroma_client = None
_embed_fn = None


def _get_client():
    global _chroma_client
    if _chroma_client is None:
        try:
            import chromadb
            _chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
            logger.info(f"✅ ChromaDB client ready at {CHROMA_PATH}")
        except ImportError:
            logger.error("chromadb not installed. Run: pip install chromadb")
        except Exception as e:
            logger.error(f"ChromaDB init failed: {e}")
    return _chroma_client


def _get_embed_fn():
    global _embed_fn
    if _embed_fn is None:
        try:
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
            _embed_fn = SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)
            logger.info(f"✅ Embedding model '{EMBED_MODEL}' loaded")
        except Exception as e:
            logger.error(f"Embedding model failed: {e}")
    return _embed_fn


def _get_collection(user_id: str):
    """Get or create a per-user ChromaDB collection."""
    client = _get_client()
    embed_fn = _get_embed_fn()
    if client is None:
        return None
    collection_name = f"user_{user_id.replace('-', '_')}_notes"
    return client.get_or_create_collection(
        name=collection_name,
        embedding_function=embed_fn,
        metadata={"hnsw:space": "cosine"},
    )


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
    """Split text into overlapping chunks for better retrieval."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)
        if current_len + sentence_len > chunk_size and current:
            chunks.append(" ".join(current))
            # Overlap: keep last few sentences
            overlap_sentences = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) <= overlap:
                    overlap_sentences.insert(0, s)
                    overlap_len += len(s)
                else:
                    break
            current = overlap_sentences
            current_len = overlap_len
        current.append(sentence)
        current_len += sentence_len

    if current:
        chunks.append(" ".join(current))

    return [c.strip() for c in chunks if c.strip()]


async def ingest_text(user_id: str, text: str, source_name: str = "document") -> dict:
    """
    Chunk text and store embeddings in ChromaDB.
    Returns: {"chunks_stored": int, "collection": str}
    """
    collection = _get_collection(user_id)
    if collection is None:
        return {"chunks_stored": 0, "error": "ChromaDB unavailable"}

    chunks = _chunk_text(text)
    if not chunks:
        return {"chunks_stored": 0, "error": "No text to ingest"}

    ids       = [f"{source_name}_{uuid.uuid4().hex[:8]}_{i}" for i in range(len(chunks))]
    metadatas = [{"source": source_name, "chunk_index": i} for i in range(len(chunks))]

    try:
        collection.upsert(documents=chunks, ids=ids, metadatas=metadatas)
        logger.info(f"Ingested {len(chunks)} chunks from '{source_name}' for user {user_id}")
        return {"chunks_stored": len(chunks), "collection": collection.name}
    except Exception as e:
        logger.error(f"Ingest failed: {e}")
        return {"chunks_stored": 0, "error": str(e)}


async def query(user_id: str, question: str, n_results: int = 5) -> dict:
    """
    Retrieve relevant context from ChromaDB for a user question.
    Returns: {"context": str, "sources": list, "found": bool}
    """
    collection = _get_collection(user_id)
    if collection is None:
        return {"context": "", "sources": [], "found": False, "error": "ChromaDB unavailable"}

    try:
        count = collection.count()
        if count == 0:
            return {"context": "", "sources": [], "found": False}

        results = collection.query(
            query_texts=[question],
            n_results=min(n_results, count),
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        # Filter by relevance (cosine distance < 0.7)
        relevant = [
            (doc, meta) for doc, meta, dist in zip(documents, metadatas, distances)
            if dist < 0.7
        ]

        if not relevant:
            return {"context": "", "sources": [], "found": False}

        context = "\n\n---\n\n".join([doc for doc, _ in relevant])
        sources = list({meta.get("source", "unknown") for _, meta in relevant})

        return {"context": context, "sources": sources, "found": True}

    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        return {"context": "", "sources": [], "found": False, "error": str(e)}


async def clear_collection(user_id: str) -> dict:
    """Delete all documents in a user's collection."""
    client = _get_client()
    if client is None:
        return {"success": False, "error": "ChromaDB unavailable"}
    try:
        collection_name = f"user_{user_id.replace('-', '_')}_notes"
        client.delete_collection(collection_name)
        return {"success": True, "collection": collection_name}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_stats(user_id: str) -> dict:
    """Returns chunk count and sources for a user's collection."""
    collection = _get_collection(user_id)
    if collection is None:
        return {"chunk_count": 0, "available": False}
    try:
        count = collection.count()
        return {"chunk_count": count, "available": True, "collection": collection.name}
    except Exception as e:
        return {"chunk_count": 0, "available": False, "error": str(e)}
