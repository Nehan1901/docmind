from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import shutil

from upload import extract_text_from_pdf, chunk_text, UPLOAD_DIR
from embeddings import embed_and_store
from query import ask_document
from database import get_db, User
from auth import (
    hash_password, verify_password, create_token,
    decode_token, get_user_by_email, create_user
)

app = FastAPI(title="DocMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Auth Models ──
class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class QueryRequest(BaseModel):
    question: str
    doc_name: str

# ── Auth Endpoints ──
@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = create_user(db, req.email, req.username, req.password)
    token = create_token(user.id, user.email)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "username": user.username}
    }

@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user.id, user.email)
    return {
        "token": token,
        "user": {"id": user.id, "email": user.email, "username": user.username}
    }

@app.get("/auth/me")
def get_me(authorization: str = None, db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": user.id, "email": user.email, "username": user.username, "provider": user.provider, "created_at": str(user.created_at)}
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Existing Endpoints ──
@app.get("/")
def root():
    return {"message": "DocMind API is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    pages = extract_text_from_pdf(str(file_path))
    chunks = chunk_text(pages)
    total_chunks = embed_and_store(chunks, file.filename)
    return {
        "filename": file.filename,
        "pages": len(pages),
        "chunks": total_chunks,
        "message": f"Successfully processed and embedded {file.filename}"
    }

@app.post("/query")
def query_document(request: QueryRequest):
    try:
        result = ask_document(request.question, request.doc_name)
        return result
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))