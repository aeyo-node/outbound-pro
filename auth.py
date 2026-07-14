"""
auth.py — Session-based authentication for Swaram multi-tenant platform.
No external JWT libraries needed — uses Supabase sessions table.
"""

import hashlib
import hmac
import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger("auth")

# Session duration: 7 days
SESSION_TTL_HOURS = 24 * 7

# ─────────────────────────────────────────────────────────────────────────────
# Password hashing (SHA-256 + salt; use bcrypt in production)
# ─────────────────────────────────────────────────────────────────────────────

def _hash_password(password: str, salt: str = "") -> str:
    """Hash a password with PBKDF2-HMAC-SHA256."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000
    ).hex()
    return f"pbkdf2${salt}${key}"


def verify_password(plain: str, stored_hash: str) -> bool:
    """Verify plain password against stored hash (any format)."""
    if not stored_hash:
        return False

    # Legacy plaintext marker — migrate on first use
    if stored_hash.startswith("$PLAINTEXT$"):
        return plain == stored_hash[len("$PLAINTEXT$"):]

    # pbkdf2$salt$key
    if stored_hash.startswith("pbkdf2$"):
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        _, salt, _ = parts
        return hmac.compare_digest(_hash_password(plain, salt), stored_hash)

    return False


def make_password_hash(password: str) -> str:
    return _hash_password(password)


# ─────────────────────────────────────────────────────────────────────────────
# Session management
# ─────────────────────────────────────────────────────────────────────────────

async def create_session(user_id: str, tenant_id: str, role: str) -> str:
    """Create a new session token and store it in Supabase."""
    from db import _adb
    token = secrets.token_urlsafe(48)
    expires_at = (datetime.utcnow() + timedelta(hours=SESSION_TTL_HOURS)).isoformat()
    db = await _adb()
    await db.table("sessions").insert({
        "token": token,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "expires_at": expires_at,
    }).execute()
    return token


async def get_session(token: str) -> Optional[dict]:
    """Look up a session token. Returns session dict or None if invalid/expired."""
    if not token:
        return None
    from db import _adb
    db = await _adb()
    try:
        result = await db.table("sessions").select("*").eq("token", token).maybe_single().execute()
        session = result.data if result else None
        if not session:
            return None
        # Check expiry
        expires = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires.tzinfo) > expires:
            await db.table("sessions").delete().eq("token", token).execute()
            return None
        return session
    except Exception as e:
        logger.warning(f"Session lookup error: {e}")
        return None


async def delete_session(token: str) -> None:
    """Delete a session (logout)."""
    from db import _adb
    db = await _adb()
    try:
        await db.table("sessions").delete().eq("token", token).execute()
    except Exception:
        pass


async def cleanup_expired_sessions() -> None:
    """Remove expired sessions (call from cron)."""
    from db import _adb
    db = await _adb()
    try:
        now = datetime.utcnow().isoformat()
        await db.table("sessions").delete().lt("expires_at", now).execute()
    except Exception as e:
        logger.warning(f"Session cleanup error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# User auth
# ─────────────────────────────────────────────────────────────────────────────

async def authenticate_user(email: str, password: str) -> Optional[dict]:
    """
    Verify email+password. Migrates legacy plaintext hash on first login.
    Returns user dict with tenant info, or None on failure.
    """
    from db import _adb
    db = await _adb()
    try:
        result = await db.table("users").select("*, tenants(*)").eq("email", email.lower().strip()).maybe_single().execute()
        user = result.data if result else None
        if not user:
            return None

        stored_hash = user.get("password_hash", "")

        # Migrate plaintext hash on first successful login
        if stored_hash.startswith("$PLAINTEXT$") and password == stored_hash[len("$PLAINTEXT$"):]:
            new_hash = make_password_hash(password)
            await db.table("users").update({"password_hash": new_hash, "last_login": datetime.utcnow().isoformat()}).eq("id", user["id"]).execute()
            user["password_hash"] = new_hash
            return user

        if not verify_password(password, stored_hash):
            return None

        # Update last_login
        await db.table("users").update({"last_login": datetime.utcnow().isoformat()}).eq("id", user["id"]).execute()
        return user

    except Exception as e:
        logger.error(f"authenticate_user error: {e}")
        return None


async def get_token_from_request(request) -> Optional[str]:
    """Extract session token from Authorization header or cookie."""
    # Try Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    # Try cookie
    return request.cookies.get("swaram_session")


async def get_current_user(request) -> Optional[dict]:
    """Full middleware helper: extract token → look up session → return user+tenant."""
    token = await get_token_from_request(request)
    if not token:
        return None
    session = await get_session(token)
    if not session:
        return None
    from db import _adb
    db = await _adb()
    try:
        result = await db.table("users").select("id, email, name, role, tenant_id").eq("id", session["user_id"]).maybe_single().execute()
        user = result.data if result else None
        if not user:
            return None
        tenant_result = await db.table("tenants").select("*").eq("id", session["tenant_id"]).maybe_single().execute()
        tenant = tenant_result.data if tenant_result else {}
        # Get subscription + plan
        sub_result = await db.table("subscriptions").select("*, billing_plans(*)").eq("tenant_id", session["tenant_id"]).eq("status", "active").maybe_single().execute()
        subscription = sub_result.data if sub_result else None
        return {
            **user,
            "tenant": tenant,
            "subscription": subscription,
            "plan": subscription.get("billing_plans", {}) if subscription else {},
            "session_token": token,
        }
    except Exception as e:
        logger.error(f"get_current_user error: {e}")
        return None
