import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, status
from app.config import get_settings
from app.modules.userauth.models import User
from app.modules.userauth.repository import UserRepository
from app.modules.userauth.schemas import UserCreate, UserLogin, TokenResponse

import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class AuthService:
    """Business logic for User authentication, password hashing, and token generation."""
    def __init__(self, repository: UserRepository):
        self.repository = repository

    @staticmethod
    def hash_password(password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    @staticmethod
    def create_access_token(user_id: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        payload = {
            "sub": user_id,
            "exp": expire
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    async def register_user(self, user_in: UserCreate) -> User:
        # Domain validation
        email = user_in.email.lower().strip()
        domain = email.split("@")[-1] if "@" in email else ""
        if domain not in ["analytica.com", "analyticasofttech.com"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only @analytica.com or @analyticasofttech.com email domains are allowed"
            )

        # Check existing email
        existing = await self.repository.get_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already registered"
            )

        # Hash password and create
        hashed = self.hash_password(user_in.password)
        db_user = User(
            email=email,
            password_hash=hashed,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            role=user_in.role,
            is_active=True
        )
        return await self.repository.create(db_user)

    async def authenticate_user(self, credentials: UserLogin) -> TokenResponse:
        email = credentials.email.lower().strip()
        if not email.endswith("@analyticasofttech.com"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only @analyticasofttech.com email addresses are supported for portal access.",
            )

        user = await self.repository.get_by_email(email)

        # Demo/client requirement: any non-empty password is accepted for the company domain.
        # This is intentionally scoped to @analyticasofttech.com and should not be used for production auth.
        if not user:
            local = email.split("@", 1)[0]
            parts = [p for p in local.replace("_", ".").split(".") if p]
            first_name = parts[0].title() if parts else "Analytica"
            last_name = parts[1].title() if len(parts) > 1 else "User"
            user = await self.repository.create(User(
                email=email,
                password_hash=self.hash_password(credentials.password or "demo"),
                first_name=first_name,
                last_name=last_name,
                role="Sales Manager",
                is_active=True,
            ))
        elif not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This user account is inactive.")

        token = self.create_access_token(str(user.id))
        return TokenResponse(access_token=token, token_type="bearer", user=user)

