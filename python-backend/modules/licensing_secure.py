"""
Secure License Manager - Uses Backend Validation Service
This module communicates with your validation server instead of calling LemonSqueezy API directly.
No API key is needed in the desktop app!
"""

import os
import json
import logging
import hashlib
import platform
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Configuration
VALIDATION_SERVICE_URL = os.environ.get(
    "VALIDATION_SERVICE_URL",
    "https://yourwebsite.com/api/desktop"  # REPLACE WITH YOUR ACTUAL DOMAIN
)
GRACE_PERIOD_DAYS = 7  # 7-day grace period for expired subscriptions

# Local storage for license
APP_DIR = os.path.join(os.path.expanduser("~"), ".offline-tools")
LICENSE_FILE = os.path.join(APP_DIR, "license.json")

# Request timeout
REQUEST_TIMEOUT = 15  # seconds


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

        # Check if it's a subscription (has expires_at) or legacy license
        expires_at_str = data.get("expires_at")
        subscription_id = data.get("subscription_id")

        if subscription_id and expires_at_str:
            # Subscription-based license
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


def validate_license_with_service(license_key: str = None, instance_id: str = None) -> Dict[str, Any]:
    """
    Validates license via backend validation service (NOT directly with LemonSqueezy).
    Returns validation result.
    """
    try:
        # Get license from local file if not provided
        if not license_key:
            local_license = check_local_license()
            if local_license.get("valid"):
                license_key = local_license.get("data", {}).get("key")
                instance_id = local_license.get("data", {}).get("instance_id")

        if not license_key:
            return {"valid": False, "error": "No license key provided"}

        # Call validation service
        url = f"{VALIDATION_SERVICE_URL}/validate-license"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        data = json.dumps({
            "license_key": license_key,
            "instance_id": instance_id or _get_instance_id(),
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            if resp_json.get("success") and resp_json.get("valid"):
                # Update local license file with validated data
                init_licensing()
                license_data = {
                    "status": resp_json.get("license_key", {}).get("status", "active"),
                    "key": license_key,
                    "instance_id": resp_json.get("instance", {}).get("id") or instance_id,
                    "last_validated": datetime.now().isoformat(),
                    "expires_at": resp_json.get("license_key", {}).get("expires_at"),
                    "activation_usage": resp_json.get("license_key", {}).get("activation_usage"),
                    "activation_limit": resp_json.get("license_key", {}).get("activation_limit"),
                }

                # Save updated license data
                try:
                    with open(LICENSE_FILE, "w") as f:
                        json.dump(license_data, f, indent=2)
                except Exception as e:
                    logger.error(f"Failed to save license data: {e}")

                return {
                    "valid": True,
                    "status": license_data["status"],
                    "expires_at": license_data.get("expires_at"),
                    "activation_usage": license_data.get("activation_usage"),
                    "activation_limit": license_data.get("activation_limit"),
                }
            else:
                return {
                    "valid": False,
                    "error": resp_json.get("error", "Invalid license"),
                }

    except urllib.error.HTTPError as e:
        if e.code == 429:
            return {
                "valid": False,
                "error": "Too many validation requests. Please try again later.",
            }
        try:
            error_body = e.read().decode("utf-8")
            error_data = json.loads(error_body)
            return {
                "valid": False,
                "error": error_data.get("error", f"Validation failed: {e.code}"),
            }
        except:
            return {
                "valid": False,
                "error": f"Validation failed: HTTP {e.code}",
            }
    except urllib.error.URLError as e:
        logger.error(f"License validation network error: {e}")
        return {
            "valid": False,
            "error": "Cannot reach validation service. Please check your internet connection.",
        }
    except Exception as e:
        logger.error(f"License validation error: {e}")
        return {
            "valid": False,
            "error": "Failed to validate license. Please try again.",
        }


def activate_license(license_key: str, instance_name: str = None) -> Dict[str, Any]:
    """
    Activates the license key via backend validation service.
    """
    init_licensing()
    instance_id = _get_instance_id()
    if not instance_name:
        instance_name = platform.node()

    if not license_key:
        return {"success": False, "error": "No license key provided"}

    # DEVELOPMENT MOCK MODE
    # Only available when explicitly enabled via environment variable
    if os.environ.get("DEV_MOCK_LICENSE") == "true":
        logger.warning("DEV: Mock license activation enabled via DEV_MOCK_LICENSE")
        if license_key.startswith("test_"):
            # Mock subscription activation
            expires_at = (datetime.now() + timedelta(days=365)).isoformat()
            mock_data = {
                "status": "active",
                "key": license_key,
                "subscription_id": license_key,
                "instance_id": instance_id,
                "activated_at": datetime.now().isoformat(),
                "expires_at": expires_at,
                "type": "subscription"
            }
            with open(LICENSE_FILE, "w") as f:
                json.dump(mock_data, f, indent=2)
            return {"success": True, "message": "Mock activation successful", "data": mock_data}
        else:
            return {"success": False, "error": "Mock Activation Failed: Key must start with 'test_'"}

    # REAL ACTIVATION - Call validation service
    try:
        url = f"{VALIDATION_SERVICE_URL}/activate-license"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        data = json.dumps({
            "license_key": license_key,
            "instance_name": instance_name,
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            if resp_json.get("success") and resp_json.get("activated"):
                # Save license locally
                license_data = {
                    "status": resp_json.get("license_key", {}).get("status", "active"),
                    "key": license_key,
                    "instance_id": resp_json.get("instance", {}).get("id") or instance_id,
                    "instance_name": instance_name,
                    "activated_at": datetime.now().isoformat(),
                    "last_validated": datetime.now().isoformat(),
                    "activation_usage": resp_json.get("license_key", {}).get("activation_usage"),
                    "activation_limit": resp_json.get("license_key", {}).get("activation_limit"),
                }

                with open(LICENSE_FILE, "w") as f:
                    json.dump(license_data, f, indent=2)

                return {
                    "success": True,
                    "message": "License activated successfully",
                    "data": license_data,
                }
            else:
                return {
                    "success": False,
                    "error": resp_json.get("error", "Activation failed"),
                }

    except urllib.error.HTTPError as e:
        if e.code == 429:
            return {
                "success": False,
                "error": "Too many activation requests. Please try again later.",
            }
        try:
            error_body = e.read().decode("utf-8")
            error_data = json.loads(error_body)
            return {
                "success": False,
                "error": error_data.get("error", f"Activation failed: {e.code}"),
            }
        except:
            return {
                "success": False,
                "error": f"Activation failed: HTTP {e.code}",
            }
    except urllib.error.URLError as e:
        logger.error(f"License activation network error: {e}")
        return {
            "success": False,
            "error": "Cannot reach activation service. Please check your internet connection.",
        }
    except Exception as e:
        logger.error(f"License activation error: {e}")
        return {
            "success": False,
            "error": "Failed to activate license. Please try again.",
        }


def deactivate_license() -> Dict[str, Any]:
    """Deactivates current license via backend validation service."""
    try:
        # Get current license info
        if not os.path.exists(LICENSE_FILE):
            return {"success": False, "error": "No active license found"}

        with open(LICENSE_FILE, "r") as f:
            data = json.load(f)

        license_key = data.get("key")
        instance_id = data.get("instance_id")

        if not license_key or not instance_id:
            return {"success": False, "error": "No active license found"}

        # Call deactivation service
        url = f"{VALIDATION_SERVICE_URL}/deactivate-license"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        request_data = json.dumps({
            "license_key": license_key,
            "instance_id": instance_id,
        }).encode("utf-8")

        req = urllib.request.Request(url, data=request_data, headers=headers, method="POST")

        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)

            if resp_json.get("success"):
                # Remove local license file
                try:
                    os.remove(LICENSE_FILE)
                except Exception as e:
                    logger.error(f"Failed to remove license file: {e}")

                return {
                    "success": True,
                    "message": "License deactivated successfully",
                }
            else:
                return {
                    "success": False,
                    "error": resp_json.get("error", "Deactivation failed"),
                }

    except urllib.error.HTTPError as e:
        logger.error(f"License deactivation HTTP error: {e.code}")
        # Even if server call fails, remove local license
        try:
            os.remove(LICENSE_FILE)
        except:
            pass
        return {"success": True, "message": "License deactivated locally"}
    except Exception as e:
        logger.error(f"License deactivation error: {e}")
        # Even if server call fails, remove local license
        try:
            os.remove(LICENSE_FILE)
        except:
            pass
        return {"success": True, "message": "License deactivated locally"}


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
                json.dump(data, f, indent=2)

            logger.info(f"Updated subscription {subscription_id} status to {status}")
            return {"success": True}
        else:
            logger.warning(f"Subscription {subscription_id} does not match local license")
            return {"success": False, "error": "Subscription ID mismatch"}

    except Exception as e:
        logger.error(f"Error updating subscription from webhook: {e}")
        return {"success": False, "error": str(e)}
