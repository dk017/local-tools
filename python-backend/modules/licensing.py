import os
import json
import logging
import hashlib
import platform
import urllib.request
import urllib.error
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Constants
LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1"
LEMONSQUEEZY_API_KEY = os.environ.get("LEMONSQUEEZY_API_KEY", "")

POLAR_API_URL = "https://api.polar.sh/v1/customer-portal"
POLAR_ORGANIZATION_ID = os.environ.get("POLAR_ORGANIZATION_ID", "")

GRACE_PERIOD_DAYS = 7  # 7-day grace period for expired subscriptions

# Local storage for license
APP_DIR = os.path.join(os.path.expanduser("~"), ".offline-tools")
LICENSE_FILE = os.path.join(APP_DIR, "license.json")

def _detect_provider(license_key: str) -> str:
    """Detect license provider based on key format."""
    # Polar keys are UUIDs (with optional prefix)
    uuid_pattern = r'^([A-Z0-9_]+-)?[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$'
    if re.match(uuid_pattern, license_key) or license_key.upper().startswith('POLAR_'):
        return 'polar'
    return 'lemonsqueezy'

def _get_instance_id():
    """Generates a stable identifier for this machine."""
    try:
        # Simple fingerprint: hostname + OS
        node = platform.node()
        system = platform.system()
        raw = f"{node}-{system}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]
    except:
        return "unknown-instance"

def init_licensing():
    """Ensures storage directory exists."""
    if not os.path.exists(APP_DIR):
        try:
            os.makedirs(APP_DIR)
        except Exception as e:
            logger.error(f"Failed to create app dir: {e}")

def check_local_license():
    """
    Checks if a valid license/subscription is stored locally.
    Returns: {"valid": bool, "license_key": str, "status": str, "expires_at": str, "in_grace_period": bool}
    """
    init_licensing()

    if not os.path.exists(LICENSE_FILE):
        return {"valid": False, "status": "missing_local_file"}

    try:
        with open(LICENSE_FILE, "r") as f:
            data = json.load(f)

        provider = data.get("provider", "lemonsqueezy")
        expires_at_str = data.get("expires_at")
        subscription_id = data.get("subscription_id")
        activation_id = data.get("activation_id")

        # Polar lifetime licenses (no expiry)
        if provider == "polar" and not expires_at_str:
            if data.get("status") == "active":
                return {
                    "valid": True,
                    "data": data,
                    "status": "active",
                    "provider": "polar",
                    "activation_id": activation_id,
                    "in_grace_period": False,
                    "lifetime": True
                }
            else:
                return {"valid": False, "data": data, "status": "inactive", "provider": "polar"}

        # License with expiry (subscription or time-limited)
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                now = datetime.now(expires_at.tzinfo) if expires_at.tzinfo else datetime.now()

                # Check if expired
                if expires_at > now:
                    # Still valid
                    return {
                        "valid": True,
                        "data": data,
                        "status": "active",
                        "expires_at": expires_at_str,
                        "subscription_id": subscription_id,
                        "activation_id": activation_id,
                        "provider": provider,
                        "in_grace_period": False
                    }
                else:
                    # Check grace period
                    grace_period_end = expires_at + timedelta(days=GRACE_PERIOD_DAYS)
                    if now <= grace_period_end:
                        # In grace period
                        return {
                            "valid": True,
                            "data": data,
                            "status": "grace_period",
                            "expires_at": expires_at_str,
                            "subscription_id": subscription_id,
                            "activation_id": activation_id,
                            "provider": provider,
                            "in_grace_period": True,
                            "grace_period_ends": grace_period_end.isoformat()
                        }
                    else:
                        # Expired beyond grace period
                        return {
                            "valid": False,
                            "data": data,
                            "status": "expired",
                            "expires_at": expires_at_str,
                            "subscription_id": subscription_id,
                            "activation_id": activation_id,
                            "provider": provider,
                            "in_grace_period": False
                        }
            except (ValueError, TypeError) as e:
                logger.error(f"Error parsing expiry date: {e}")
                return {"valid": False, "status": "error_parsing_expiry", "data": data}
        else:
            # Legacy one-time license (backward compatibility)
            if data.get("status") == "active":
                return {"valid": True, "data": data, "status": "active", "legacy": True}
            else:
                return {"valid": False, "data": data, "status": "inactive"}

    except Exception as e:
        logger.error(f"Error reading license file: {e}")
        return {"valid": False, "status": "error_reading_file"}

def validate_subscription_with_api(subscription_id: str) -> Optional[Dict[str, Any]]:
    """
    Validates subscription status with LemonSqueezy API.
    Returns subscription data if valid, None otherwise.
    """
    if not LEMONSQUEEZY_API_KEY:
        logger.warning("Cannot validate subscription: No API key set")
        return None

    try:
        url = f"{LEMONSQUEEZY_API_URL}/subscriptions/{subscription_id}"
        headers = {
            "Accept": "application/vnd.api+json",
            "Authorization": f"Bearer {LEMONSQUEEZY_API_KEY}"
        }

        req = urllib.request.Request(url, headers=headers, method="GET")

        with urllib.request.urlopen(req) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            if resp_json.get("data"):
                sub_data = resp_json["data"]
                attributes = sub_data.get("attributes", {})

                return {
                    "subscription_id": subscription_id,
                    "status": attributes.get("status"),  # active, cancelled, expired, etc.
                    "expires_at": attributes.get("expires_at"),
                    "renews_at": attributes.get("renews_at"),
                    "cancelled": attributes.get("cancelled", False),
                    "customer_id": attributes.get("customer_id")
                }
            return None

    except urllib.error.HTTPError as e:
        logger.error(f"API Error validating subscription: {e.code}")
        return None
    except Exception as e:
        logger.error(f"Error validating subscription: {e}")
        return None

def _activate_with_polar(license_key: str, instance_name: str) -> Dict[str, Any]:
    """Activate license key with Polar API."""
    if not POLAR_ORGANIZATION_ID:
        return {"success": False, "error": "POLAR_ORGANIZATION_ID not configured"}

    try:
        url = f"{POLAR_API_URL}/license-keys/activate"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        data = json.dumps({
            "key": license_key,
            "organization_id": POLAR_ORGANIZATION_ID,
            "label": instance_name or platform.node()
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            # Polar returns: { id, license_key_id, label, license_key: { status, expires_at, ... } }
            activation_id = resp_json.get("id")
            license_data = resp_json.get("license_key", {})

            return {
                "success": True,
                "activation_id": activation_id,
                "status": license_data.get("status", "granted"),
                "expires_at": license_data.get("expires_at"),
                "activation_limit": license_data.get("limit"),
                "activation_usage": license_data.get("usage"),
            }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        logger.error(f"Polar activation error: {e.code} - {error_body}")
        if e.code == 403:
            return {"success": False, "error": "Activation limit reached or not supported"}
        elif e.code == 404:
            return {"success": False, "error": "License key not found"}
        return {"success": False, "error": f"Activation failed: {error_body}"}
    except Exception as e:
        logger.error(f"Polar activation exception: {e}")
        return {"success": False, "error": str(e)}

def _validate_with_polar(license_key: str, activation_id: str = None) -> Dict[str, Any]:
    """Validate license key with Polar API."""
    if not POLAR_ORGANIZATION_ID:
        return {"success": False, "error": "POLAR_ORGANIZATION_ID not configured"}

    try:
        url = f"{POLAR_API_URL}/license-keys/validate"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        payload = {
            "key": license_key,
            "organization_id": POLAR_ORGANIZATION_ID,
        }
        if activation_id:
            payload["activation_id"] = activation_id

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            # Polar returns license key details
            return {
                "success": True,
                "valid": True,
                "status": resp_json.get("status", "granted"),
                "expires_at": resp_json.get("expires_at"),
                "activation_limit": resp_json.get("limit"),
                "activation_usage": resp_json.get("usage"),
            }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        logger.error(f"Polar validation error: {e.code} - {error_body}")
        return {"success": False, "valid": False, "error": f"Validation failed: {error_body}"}
    except Exception as e:
        logger.error(f"Polar validation exception: {e}")
        return {"success": False, "valid": False, "error": str(e)}

def activate_license(license_key: str, instance_name: str = None):
    """
    Activates the license key with the appropriate provider (Polar or LemonSqueezy).
    Auto-detects provider based on key format.
    """
    init_licensing()
    instance_id = _get_instance_id()
    if not instance_name:
        instance_name = platform.node()

    if not license_key:
        return {"success": False, "error": "No license key provided"}

    # Detect provider
    provider = _detect_provider(license_key)
    logger.info(f"Detected license provider: {provider}")

    # MOCK MODE - Only available when explicitly enabled via environment variable
    if os.environ.get("DEV_MOCK_LICENSE") == "true":
        logger.warning("DEV: Mock license activation enabled via DEV_MOCK_LICENSE")
        if license_key.startswith("test_"):
            expires_at = (datetime.now() + timedelta(days=365)).isoformat()
            mock_data = {
                "status": "active",
                "key": license_key,
                "subscription_id": license_key,
                "instance_id": instance_id,
                "activated_at": datetime.now().isoformat(),
                "expires_at": expires_at,
                "type": "subscription",
                "provider": "mock"
            }
            with open(LICENSE_FILE, "w") as f:
                json.dump(mock_data, f)
            return {"success": True, "message": "Mock activation successful", "data": mock_data}
        else:
            return {"success": False, "error": "Mock Activation Failed: Key must start with 'test_'"}

    # POLAR ACTIVATION
    if provider == 'polar':
        if not POLAR_ORGANIZATION_ID:
            return {"success": False, "error": "Polar license service is not configured. Please contact support."}

        result = _activate_with_polar(license_key, instance_name)
        if result.get("success"):
            # Parse expiry date
            expires_at = result.get("expires_at")
            if expires_at:
                try:
                    expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    expires_at_str = expires_dt.isoformat()
                except:
                    expires_at_str = None
            else:
                expires_at_str = None  # Polar lifetime licenses may not have expiry

            license_data = {
                "status": "active",
                "key": license_key,
                "activation_id": result.get("activation_id"),
                "instance_id": instance_id,
                "activated_at": datetime.now().isoformat(),
                "expires_at": expires_at_str,
                "type": "license",
                "provider": "polar",
                "activation_limit": result.get("activation_limit"),
                "activation_usage": result.get("activation_usage"),
            }
            with open(LICENSE_FILE, "w") as f:
                json.dump(license_data, f)
            return {"success": True, "message": "License activated successfully", "data": license_data}
        else:
            return result

    # LEMONSQUEEZY ACTIVATION
    if not LEMONSQUEEZY_API_KEY:
        return {"success": False, "error": "License service is not configured. Please contact support."}

    # REAL ACTIVATION - For subscriptions, validate with API
    try:
        # Try to validate as subscription first
        subscription_data = validate_subscription_with_api(license_key)

        if subscription_data:
            # It's a valid subscription
            if subscription_data["status"] in ["active", "trialing"]:
                expires_at = subscription_data.get("expires_at") or subscription_data.get("renews_at")
                if expires_at:
                    # Parse and format expiry date
                    try:
                        if isinstance(expires_at, str):
                            expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                        else:
                            expires_dt = expires_at
                        expires_at_str = expires_dt.isoformat()
                    except:
                        # Fallback: set to 1 year from now if parsing fails
                        expires_at_str = (datetime.now() + timedelta(days=365)).isoformat()
                else:
                    expires_at_str = (datetime.now() + timedelta(days=365)).isoformat()

                license_data = {
                    "status": "active",
                    "key": license_key,
                    "subscription_id": license_key,
                    "instance_id": instance_id,
                    "activated_at": datetime.now().isoformat(),
                    "expires_at": expires_at_str,
                    "type": "subscription",
                    "provider": "lemonsqueezy",
                    "customer_id": subscription_data.get("customer_id")
                }
                with open(LICENSE_FILE, "w") as f:
                    json.dump(license_data, f)
                return {"success": True, "message": "Subscription activated successfully", "data": license_data}
            else:
                return {"success": False, "error": f"Subscription status: {subscription_data['status']}"}

        # Fallback: Try legacy license activation (for backward compatibility)
        url = f"{LEMONSQUEEZY_API_URL}/licenses/activate"
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {LEMONSQUEEZY_API_KEY}"
        }
        data = json.dumps({
            "license_key": license_key,
            "instance_name": instance_name
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            if resp_json.get("activated"):
                # Save locally (legacy license)
                license_data = {
                    "status": "active",
                    "key": license_key,
                    "instance_id": resp_json.get("instance_id", instance_id),
                    "meta": resp_json.get("meta"),
                    "activated_at": datetime.now().isoformat(),
                    "type": "license"
                }
                with open(LICENSE_FILE, "w") as f:
                    json.dump(license_data, f)
                return {"success": True, "message": "Activated successfully", "data": license_data}
            else:
                 error_msg = resp_json.get("error", "Activation failed")
                 return {"success": False, "error": error_msg}

    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        return {"success": False, "error": f"API Error: {e.code} - {error_body}"}
    except Exception as e:
        logger.error(f"Activation Exception: {e}")
        return {"success": False, "error": str(e)}

def update_subscription_from_webhook(subscription_id: str, status: str, expires_at: Optional[str] = None):
    """
    Updates local license file from webhook data.
    Called by webhook handler when subscription events occur.
    """
    init_licensing()

    try:
        # Read existing license file if it exists
        data = {}
        if os.path.exists(LICENSE_FILE):
            with open(LICENSE_FILE, "r") as f:
                data = json.load(f)

        # Only update if this subscription matches
        if data.get("subscription_id") == subscription_id or data.get("key") == subscription_id:
            data["status"] = "active" if status in ["active", "trialing"] else "inactive"
            data["subscription_id"] = subscription_id

            if expires_at:
                data["expires_at"] = expires_at
            elif status == "active":
                # If no expiry provided but status is active, set to 1 year from now
                data["expires_at"] = (datetime.now() + timedelta(days=365)).isoformat()

            data["updated_at"] = datetime.now().isoformat()
            data["type"] = "subscription"

            with open(LICENSE_FILE, "w") as f:
                json.dump(data, f)

            logger.info(f"Updated subscription {subscription_id} status to {status}")
            return {"success": True}
        else:
            logger.warning(f"Subscription {subscription_id} does not match local license")
            return {"success": False, "error": "Subscription ID mismatch"}

    except Exception as e:
        logger.error(f"Error updating subscription from webhook: {e}")
        return {"success": False, "error": str(e)}

def deactivate_license():
    """Removes local license file."""
    if os.path.exists(LICENSE_FILE):
        try:
            os.remove(LICENSE_FILE)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": True}
