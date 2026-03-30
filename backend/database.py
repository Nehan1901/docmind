from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

engine = create_engine("sqlite:///./docmind.db", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    username = Column(String)
    password_hash = Column(String, nullable=True)
    provider = Column(String, default="email")
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    doc_name = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sources = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


Base.metadata.create_all(bind=engine)

def get_or_create_user(db: Session, email: str, username: str, provider: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, username=username, provider=provider)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
