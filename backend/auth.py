import jwt
import hashlib
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import User

SECRET_KEY = "docmind-secret-key-change-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

def hash_password(password: str) -> str:
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return salt.hex() + ":" + key.hex()

def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_hex, key_hex = password_hash.split(":")
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return key.hex() == key_hex
    except:
        return False

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, email: str, username: str, password: str = None, provider: str = "email"):
    user = User(
        email=email,
        username=username,
        password_hash=hash_password(password) if password else None,
        provider=provider
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user