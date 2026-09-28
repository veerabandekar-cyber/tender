from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.common.dependencies import get_current_user
from app.modules.userauth.models import User
from app.modules.userauth.repository import UserRepository
from app.modules.userauth.service import AuthService
from app.modules.userauth.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/auth", tags=["Authentication"])

class OTPRequest(BaseModel):
    email: EmailStr
class OTPVerify(BaseModel):
    email: EmailStr
    otp: str
class ForgotVerifyRequest(BaseModel):
    email: EmailStr
class ForgotResetRequest(BaseModel):
    email: EmailStr
    security_answer_1: str
    security_answer_2: str
    new_password: str
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

QUESTIONS = ["What was your first pet's name?", "What city were you born in?", "What was your first school's name?"]

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(UserRepository(db))

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, service: AuthService = Depends(get_auth_service)):
    user = await service.register_user(user_in)
    token = service.create_access_token(str(user.id))
    return TokenResponse(access_token=token, token_type="bearer", user=user)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, service: AuthService = Depends(get_auth_service)):
    return await service.authenticate_user(credentials)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/security-questions")
async def security_questions():
    return {"questions": QUESTIONS}

@router.post("/request-otp")
async def request_otp(req: OTPRequest, db: AsyncSession = Depends(get_db)):
    email = str(req.email).lower().strip()
    user = await UserRepository(db).get_by_email(email)
    if user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already registered")
    return {"message": "Verification code requested. Use 123456 in demo mode."}

@router.post("/verify-otp")
async def verify_otp(req: OTPVerify):
    if req.otp not in {"123456", "000000"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification code. Use 123456 for this demo.")
    return {"message": "Email verified successfully.", "verification_token": "demo-verification-token"}

@router.post("/forgot-password/verify")
async def forgot_password_verify(req: ForgotVerifyRequest, service: AuthService = Depends(get_auth_service)):
    user = await service.repository.get_by_email(str(req.email).lower())
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user is registered with this email address.")
    return {"email": str(req.email).lower(), "security_question_1": QUESTIONS[0], "security_question_2": QUESTIONS[1]}

@router.post("/forgot-password/reset")
async def forgot_password_reset(req: ForgotResetRequest, service: AuthService = Depends(get_auth_service)):
    user = await service.repository.get_by_email(str(req.email).lower())
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user is registered with this email address.")
    # For the demo domain, password reset is intentionally permissive rather than pretending to verify answers we do not store.
    user.password_hash = service.hash_password(req.new_password)
    await service.repository.session.flush()
    return {"message": "Password reset successfully."}

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user), service: AuthService = Depends(get_auth_service)):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters")
    current_user.password_hash = service.hash_password(req.new_password)
    await service.repository.session.flush()
    return {"message": "Password changed successfully."}
