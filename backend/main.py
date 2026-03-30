import os
import shutil
import json
from functools import lru_cache

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from jwt import PyJWKClient
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from auth import create_token, create_user, decode_token, get_user_by_email, verify_password
from database import ChatMessage, User, get_db, get_or_create_user
from embeddings import embed_and_store
from query import ask_document, stream_document
from upload import UPLOAD_DIR, chunk_text, extract_text_from_pdf

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

app = FastAPI(title="DocMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class MicrosoftAuthRequest(BaseModel):
    email: str
    name: str
    accessToken: str


class QueryRequest(BaseModel):
    question: str
    doc_name: str


class HistoryRequest(BaseModel):
    doc_name: str
    role: str
    content: str
    sources: list[dict] = []


def auth_response(user: User):
    return {
        "token": create_token(user.id, user.email),
        "user": {"id": user.id, "email": user.email, "username": user.username},
    }


@lru_cache(maxsize=1)
def google_jwks_client() -> PyJWKClient:
    return PyJWKClient("https://www.googleapis.com/oauth2/v3/certs")


def verify_google_credential(credential: str) -> dict[str, str]:
    google_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("VITE_GOOGLE_CLIENT_ID")
    if not google_client_id:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID is not configured")

    try:
        signing_key = google_jwks_client().get_signing_key_from_jwt(credential)
        payload = jwt.decode(
            credential,
            signing_key.key,
            algorithms=["RS256"],
            audience=google_client_id,
            issuer=["accounts.google.com", "https://accounts.google.com"],
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Google credential") from exc

    email = payload.get("email")
    email_verified = payload.get("email_verified")
    name = payload.get("name") or (email.split("@")[0] if email else None)
    if email_verified is False:
        raise HTTPException(status_code=400, detail="Google account email is not verified")
    if not email or not name:
        raise HTTPException(status_code=400, detail="Google account is missing email or name")
    return {"email": email, "name": name}


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=401)
        return user
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, req.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user = create_user(db, req.email, req.username, req.password)
    return auth_response(user)


@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return auth_response(user)


@app.post("/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    verified = verify_google_credential(req.credential)
    user = get_or_create_user(db, verified["email"], verified["name"], "google")
    return auth_response(user)


@app.post("/auth/microsoft")
def microsoft_auth(req: MicrosoftAuthRequest, db: Session = Depends(get_db)):
    if not req.email or not req.name or not req.accessToken:
        raise HTTPException(status_code=400, detail="Missing Microsoft account data")
    user = get_or_create_user(db, req.email, req.name, "microsoft")
    return auth_response(user)


@app.get("/auth/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "provider": user.provider,
        "created_at": str(user.created_at),
    }


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
        "message": f"Successfully processed and embedded {file.filename}",
    }


@app.get("/document/{filename}")
async def get_document(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
    )


@app.post("/query")
def query_document(request: QueryRequest):
    try:
        return ask_document(request.question, request.doc_name)
    except Exception as exc:
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/query/stream")
def query_document_stream(request: QueryRequest):
    try:
        return StreamingResponse(
            stream_document(request.question, request.doc_name),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as exc:
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/history/{doc_name}")
def get_history(
    doc_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user.id, ChatMessage.doc_name == doc_name)
        .order_by(ChatMessage.created_at.asc())
        .limit(50)
        .all()
    )

    return {
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": json.loads(message.sources) if message.sources else [],
                "created_at": message.created_at.isoformat(),
            }
            for message in history
        ]
    }


@app.post("/history")
def save_history(
    request: HistoryRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = ChatMessage(
        user_id=user.id,
        doc_name=request.doc_name,
        role=request.role,
        content=request.content,
        sources=json.dumps(request.sources) if request.sources else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return {"id": message.id}


@app.delete("/history/{doc_name}")
def delete_history(
    doc_name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user.id, ChatMessage.doc_name == doc_name)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted": deleted}


@app.get("/user/documents")
def get_user_documents(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            ChatMessage.doc_name,
            func.max(ChatMessage.created_at).label("last_active"),
            func.count(ChatMessage.id).label("message_count"),
        )
        .filter(ChatMessage.user_id == user.id)
        .group_by(ChatMessage.doc_name)
        .order_by(desc("last_active"))
        .all()
    )

    documents = []
    for result in results:
        last_msg = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.user_id == user.id,
                ChatMessage.doc_name == result.doc_name,
                ChatMessage.role == "ai",
            )
            .order_by(ChatMessage.created_at.desc())
            .first()
        )
        preview = last_msg.content if last_msg else ""
        documents.append(
            {
                "name": result.doc_name,
                "last_message": f"{preview[:60]}..." if len(preview) > 60 else preview,
                "last_active": result.last_active.isoformat() if result.last_active else None,
                "message_count": result.message_count,
            }
        )

    return {"documents": documents}
