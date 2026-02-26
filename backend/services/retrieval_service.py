import os
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document

# Internal Imports
from ..config import settings

# ==========================================
# 🛡️ HYBRID SEARCH SETUP
# ==========================================
BM25_READY = False
try:
    from langchain_community.retrievers import BM25Retriever
    import rank_bm25
    BM25_READY = True
except ImportError:
    BM25_READY = False

class RetrievalService:
    def __init__(self):
        self.vectorstore = None
        self.bm25_retriever = None
        self.initialize_brain()

    def initialize_brain(self):
        try:
            if not settings.CHROMA_DB_DIR.exists():
                print(f"⚠️ WARNING: Database folder not found at {settings.CHROMA_DB_DIR}")
                return

            embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001", 
                google_api_key=settings.GOOGLE_API_KEY
            )
            self.vectorstore = Chroma(
                collection_name="carmen_knowledge",
                embedding_function=embeddings,
                persist_directory=str(settings.CHROMA_DB_DIR)
            )
            
            if BM25_READY:
                self.rebuild_bm25_index()

            print("✅ AI Brain Initialization Complete.")
        except Exception as e:
            print(f"❌ Error Initializing AI Brain: {e}")

    def rebuild_bm25_index(self):
        try:
            all_data = self.vectorstore.get()
            docs = []
            if all_data['documents']:
                for i in range(len(all_data['documents'])):
                    docs.append(Document(
                        page_content=all_data['documents'][i],
                        metadata=all_data['metadatas'][i] if all_data['metadatas'] else {}
                    ))
            
            if docs:
                self.bm25_retriever = BM25Retriever.from_documents(docs)
                self.bm25_retriever.k = 3
            else:
                self.bm25_retriever = None
        except Exception as e:
            print(f"❌ BM25 Rebuild Failed: {e}")
            self.bm25_retriever = None

    def search(self, query: str):
        passed_docs = []
        source_debug = []
        
        if not self.vectorstore:
            return passed_docs, source_debug

        unique_contents = set()

        try:
            # 1. Vector Search
            vec_results = self.vectorstore.similarity_search_with_score(query, k=4)
            for doc, score in vec_results:
                if doc.page_content not in unique_contents:
                    passed_docs.append(doc)
                    unique_contents.add(doc.page_content)
                    source_debug.append({
                        "source": doc.metadata.get("source", "unknown"), 
                        "score": f"{score:.4f} (Vector)"
                    })

            # 2. Keyword Search
            if self.bm25_retriever:
                bm25_results = self.bm25_retriever.invoke(query)
                for doc in bm25_results[:2]:
                    if doc.page_content not in unique_contents:
                        passed_docs.append(doc)
                        unique_contents.add(doc.page_content)
                        source_debug.append({
                            "source": doc.metadata.get("source", "unknown"), 
                            "score": "Top Rank (Keyword)"
                        })
        except Exception as e:
            print(f"❌ Search Error: {e}")
            
        return passed_docs, source_debug

# Singleton instance
retrieval_service = RetrievalService()
