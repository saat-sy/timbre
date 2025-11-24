import os
import httpx
import json
from typing import Optional, Dict, Any
from jose import jwt, jwk
from jose.utils import base64url_decode
from fastapi import HTTPException, status
from shared.logging import get_logger

logger = get_logger(__name__)

class CognitoAuth:
    def __init__(self):
        self.user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
        self.region = os.getenv("COGNITO_REGION")
        self.client_id = os.getenv("COGNITO_CLIENT_ID")
        
        if not self.user_pool_id or not self.region:
            logger.warning("Cognito configuration missing. Auth will fail if enabled.")
            self.jwks_url = None
        else:
            self.jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
            
        self._jwks: Optional[Dict[str, Any]] = None

    async def get_jwks(self) -> Dict[str, Any]:
        if self._jwks:
            return self._jwks
            
        if not self.jwks_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server misconfigured: Missing Cognito settings"
            )

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.jwks_url)
                response.raise_for_status()
                self._jwks = response.json()
                logger.info("Successfully fetched JWKS from Cognito")
                return self._jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch authentication keys"
            )

    async def verify_token(self, token: str) -> Dict[str, Any]:
        if not self.jwks_url:
             raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Server misconfigured: Missing Cognito settings"
            )

        try:
            headers = jwt.get_unverified_headers(token)
            kid = headers.get("kid")
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token headers"
                )

            jwks = await self.get_jwks()
            
            key_index = -1
            for i, key in enumerate(jwks.get("keys", [])):
                if kid == key.get("kid"):
                    key_index = i
                    break
            
            if key_index == -1:
                logger.info("Key not found, refreshing JWKS")
                self._jwks = None
                jwks = await self.get_jwks()
                for i, key in enumerate(jwks.get("keys", [])):
                    if kid == key.get("kid"):
                        key_index = i
                        break
            
            if key_index == -1:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Public key not found in JWKS"
                )

            public_key = jwks["keys"][key_index]
            
            hmac_key = jwk.construct(public_key)
            
            claims = jwt.decode(
                token,
                hmac_key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}",
                options={"verify_at_hash": False}
            )
            
            return claims

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTClaimsError as e:
            logger.warning(f"Claims error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims"
            )
        except jwt.JWTError as e:
            logger.warning(f"JWT error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
