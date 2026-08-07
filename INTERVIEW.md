# Local RAG Backend Interview Guide

This document is a practical map of the backend so you can understand how the system starts, how documents are processed, how chunks and embeddings flow through the pipeline, and how to run the backend correctly.

---

## 1. What this backend does

This project is a local multimodal RAG system.

It can:

- ingest PDFs, images, and audio files
- extract text or descriptions from them
- split that content into chunks
- create embeddings for those chunks
- store them in a local FAISS vector index
- retrieve relevant chunks for a user question
- generate an answer with a local LLM via Ollama

The backend is implemented in Python with FastAPI.

---

## 2. How to run the backend properly

There are two different runtime actions:

1. Ingest documents and build/update the local vector index
2. Start the FastAPI server so the frontend or API clients can use it

### 2.1 Prerequisites

You need:

- Python installed
- Ollama installed and running
- backend dependencies installed

### 2.2 Start Ollama

Open a separate terminal and run:

```powershell
ollama serve
```

You should also make sure the model you want is available. The project defaults to:

- vision-language model: qwen2.5vl:7b

You can verify models with:

```powershell
ollama list
```

### 2.3 Create or activate the backend environment

From the repository root:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks the script, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

### 2.4 Run the backend API server

From the backend folder:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn api.server:app --reload --host 127.0.0.1 --port 8000
```

This starts the FastAPI app.

Open the docs at:

- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/health

### 2.5 Ingest existing local documents into the vector store

If you want to process files already placed into the local data folders and build the index, run:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

Important:

- this is not the API server
- it is the ingestion/build step
- it reads files from the local data folders and writes embeddings to the vector store

---

## 3. Important backend files and what they do

### Entry points

- [backend/main.py](backend/main.py)
  - entry point for ingestion
  - runs process_inputs()

- [backend/api/server.py](backend/api/server.py)
  - creates the FastAPI app
  - exposes the API endpoints

- [backend/api/routes.py](backend/api/routes.py)
  - contains the upload and ask endpoints
  - coordinates processing and retrieval

### Core pipeline modules

- [backend/modules/rag_pipeline.py](backend/modules/rag_pipeline.py)
  - orchestrates ingestion from PDFs, images, and audio
  - calls the modality-specific processors
  - splits text into chunks
  - sends chunks to the embedding/indexing layer

- [backend/modules/retriever.py](backend/modules/retriever.py)
  - performs semantic, BM25, keyword, TF-IDF, or hybrid retrieval
  - calls Ollama for retrieval hint generation and final answer generation

- [backend/modules/embedding_store.py](backend/modules/embedding_store.py)
  - creates embeddings for chunks
  - stores them in FAISS
  - stores metadata in JSON

### Modality processors

- [backend/modules/pdf_processor.py](backend/modules/pdf_processor.py)
  - extracts text from PDFs using OCR/vision processing via Ollama

- [backend/modules/image_processor.py](backend/modules/image_processor.py)
  - describes images and extracts visible text via Ollama

- [backend/modules/audio_processor.py](backend/modules/audio_processor.py)
  - transcribes audio using faster-whisper

### Configuration and storage

- [backend/config.py](backend/config.py)
  - defines local directories for PDFs, images, audio, processed output, and vectorstore

- [backend/modules/models.py](backend/modules/models.py)
  - centralizes model loading and vectorstore file paths

---

## 4. End-to-end RAG flow

Here is the full flow from a file to an answer.

### A. Input stage

You can add documents in two ways:

1. Put files into the local folders:

- [backend/data/pdfs](backend/data/pdfs)
- [backend/data/images](backend/data/images)
- [backend/data/audio](backend/data/audio)

2. Upload via API:

- POST /upload/

### B. Processing stage

When ingestion runs, the backend processes each file type:

- PDF
  - the PDF is opened page by page
  - each page is converted to an image
  - Ollama vision model extracts text or describes the page

- Image
  - the image file is sent to the Ollama vision model
  - the model returns a caption/description, including any visible text

- Audio
  - the audio file is transcribed with faster-whisper
  - the transcript is produced as text

### C. Chunking stage

The extracted text is passed into the chunking function:

- chunk size: 300 words
- overlap: 50 words

This is implemented in [backend/modules/rag_pipeline.py](backend/modules/rag_pipeline.py).

Why chunking matters:

- large documents are broken into smaller searchable units
- each chunk can be embedded and retrieved more efficiently

### D. Embedding stage

Each chunk is sent to the embedding store:

- [backend/modules/embedding_store.py](backend/modules/embedding_store.py)
- the chunk text is embedded with the local SentenceTransformer model from [backend/local_models/all-MiniLM-L6-v2](backend/local_models/all-MiniLM-L6-v2)
- the embedding vector is added to the FAISS index

### E. Metadata stage

Every chunk gets metadata:

- chunk id
- modality (text, image, audio)
- source file
- page number if relevant
- the text excerpt itself

This metadata is stored in:

- [backend/vectorstore/metadata.json](backend/vectorstore/metadata.json)

### F. Persisting the index

The vector data is written to:

- [backend/vectorstore/index.faiss](backend/vectorstore/index.faiss)
- [backend/vectorstore/metadata.json](backend/vectorstore/metadata.json)

BM25 data is also persisted to:

- [backend/vectorstore/bm25_corpus.json](backend/vectorstore/bm25_corpus.json)
- [backend/vectorstore/bm25_ids.json](backend/vectorstore/bm25_ids.json)

### G. Query stage

When a user asks a question:

- the /ask/ endpoint receives the request
- if a file is attached, it is processed in the same way as upload
- the extracted file content is appended to the user query
- retrieval happens
- an answer is generated

---

## 5. How chunks and embeddings flow through the system

This is the main data path.

### Flow summary

Raw file -> processor -> text extraction -> chunking -> embedding -> FAISS index + metadata -> retrieval -> LLM answer

### Detailed path

1. A PDF, image, or audio file enters the system.
2. The relevant processor extracts readable text:
   - PDF -> OCR-like extraction via Ollama
   - Image -> caption/extracted text via Ollama
   - Audio -> transcription via faster-whisper
3. The text is split into chunks with overlap.
4. Each chunk is passed to add_to_index(...).
5. add_to_index(...) does three important things:
   - creates a UUID-based chunk id
   - encodes the chunk with the embedding model
   - stores the chunk vector in FAISS
6. The same function also saves metadata about that chunk.
7. The metadata store becomes the lookup table that connects a vector to its text and source.
8. During retrieval, the query is embedded and compared against the stored vectors.
9. The most relevant chunks are selected.
10. Those chunks are passed to Ollama as context.
11. Ollama generates the final answer and returns citations.

### Important conceptual point

The embeddings are not stored in the same place as the raw text.
They are stored separately:

- vector values in FAISS
- raw chunk text and source details in metadata JSON

That is why the metadata store is critical: it links the embedding back to the original text and file.

---

## 6. How retrieval works

The retrieval layer is implemented in [backend/modules/retriever.py](backend/modules/retriever.py).

Supported retrieval methods:

- semantic: FAISS semantic search
- bm25: BM25 scoring
- keyword: literal keyword matching
- tfidf: TF-IDF similarity
- hybrid: combines several approaches

The default is hybrid.

The flow is:

1. Ollama is asked to produce a retrieval hint from the user question
2. the backend retrieves the top relevant chunks
3. those chunks are assembled into context
4. Ollama uses that context to answer the question

---

## 7. API endpoints you should know

### Health check

- GET /health

### Upload a file

- POST /upload/

### Ask a question

- POST /ask/

### Retrieve uploaded file

- GET /uploads/{filename}

### Reset all data

- DELETE /reset/

---

## 8. Typical local workflow

### Option A: build the index from local files

1. Place files into the local data folders
2. Run:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py
```

3. Start the API server:

```powershell
uvicorn api.server:app --reload --host 127.0.0.1 --port 8000
```

4. Use the frontend or API to ask questions

### Option B: upload files directly through the API

1. Start the server
2. POST a PDF/image/audio file to /upload/
3. Ask a question through /ask/

---

## 9. Common troubleshooting notes

### Backend import errors

If Python complains about missing modules, reinstall dependencies:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### Ollama errors

If the backend cannot use the vision or LLM model:

- ensure Ollama is running
- verify your model is downloaded
- check the environment variable in [backend/.env](backend/.env)

### No answers coming back

Check:

- whether any documents were indexed
- whether the vectorstore files exist
- whether the metadata JSON contains entries

### Server not reachable

Make sure you are running the server from the backend folder so the Python package imports resolve correctly.

---

## 10. Quick navigation cheat sheet

If you want to understand one part quickly, start here:

- Start the server: [backend/api/server.py](backend/api/server.py)
- Add upload and ask routes: [backend/api/routes.py](backend/api/routes.py)
- Run ingestion: [backend/main.py](backend/main.py)
- Chunk and ingest docs: [backend/modules/rag_pipeline.py](backend/modules/rag_pipeline.py)
- Create embeddings and index vectors: [backend/modules/embedding_store.py](backend/modules/embedding_store.py)
- Retrieve relevant chunks: [backend/modules/retriever.py](backend/modules/retriever.py)
- PDF extraction: [backend/modules/pdf_processor.py](backend/modules/pdf_processor.py)
- Image description: [backend/modules/image_processor.py](backend/modules/image_processor.py)
- Audio transcription: [backend/modules/audio_processor.py](backend/modules/audio_processor.py)
- Storage paths: [backend/config.py](backend/config.py)

---

## 11. One-sentence summary

The backend takes a document, converts it into text, splits it into chunks, embeds the chunks into a FAISS vector index, stores the chunk metadata, retrieves the best matching chunks for a question, and then uses Ollama to answer with citations.
