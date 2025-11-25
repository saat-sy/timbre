from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from service.auth.auth_service import CognitoAuth
from typing import Dict, Any

security = HTTPBearer()
auth_service = CognitoAuth()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = credentials.credentials
    return await auth_service.verify_token(token)

async def get_ws_token(token: str) -> Dict[str, Any]:
    return await auth_service.verify_token(token)
