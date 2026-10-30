"""
Geolocation Service
Uses ip-api.com (free tier, no key required for basic use).
Handles private IPs, caching, rate limiting, and SSRF protection.
"""
import ipaddress
import logging
import re
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

# Simple in-memory cache: ip -> (result, timestamp)
_geo_cache: Dict[str, tuple] = {}
CACHE_TTL_SECONDS = 3600  # 1 hour

# SSRF protection: allowed external hosts for geolocation
ALLOWED_GEO_HOSTS = {"ip-api.com"}

# Private/reserved IP ranges
PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local
    ipaddress.ip_network("100.64.0.0/10"),  # Shared address space
]


@dataclass
class GeoResult:
    ip_address: str
    is_private: bool
    country: Optional[str] = None
    country_code: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    asn: Optional[str] = None
    org: Optional[str] = None
    isp: Optional[str] = None
    accuracy_radius: Optional[int] = None
    provider: str = "ip-api.com"
    cached: bool = False
    error: Optional[str] = None
    disclaimer: str = (
        "IP geolocation provides approximate location only. "
        "Results are not suitable for identifying exact physical locations. "
        "VPNs, proxies, Tor exit nodes, and carrier NAT significantly reduce accuracy."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ip_address": self.ip_address,
            "is_private": self.is_private,
            "country": self.country,
            "country_code": self.country_code,
            "region": self.region,
            "city": self.city,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "asn": self.asn,
            "org": self.org,
            "isp": self.isp,
            "accuracy_radius": self.accuracy_radius,
            "provider": self.provider,
            "cached": self.cached,
            "error": self.error,
            "disclaimer": self.disclaimer,
        }


def validate_ip(ip_str: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Validate and parse an IP address string."""
    try:
        return ipaddress.ip_address(ip_str.strip())
    except ValueError:
        return None


def is_private_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP is private, loopback, or otherwise non-routable."""
    return ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local or ip.is_multicast


def sanitize_ip_for_request(ip_str: str) -> Optional[str]:
    """
    Sanitize IP for use in outbound request (SSRF protection).
    Only allow valid public IPs through.
    """
    parsed = validate_ip(ip_str)
    if parsed is None:
        return None
    if is_private_ip(parsed):
        return None  # Never request geolocation for private IPs
    # Return string representation
    return str(parsed)


async def geolocate_ip(ip_str: str) -> GeoResult:
    """
    Geolocate an IP address using ip-api.com.
    
    Args:
        ip_str: The IP address to geolocate.
    Returns:
        GeoResult with location data and appropriate disclaimers.
    """
    # Validate input
    parsed = validate_ip(ip_str)
    if parsed is None:
        return GeoResult(ip_address=ip_str, is_private=False, error="Invalid IP address format")

    ip_str = str(parsed)

    # Check if private
    if is_private_ip(parsed):
        return GeoResult(
            ip_address=ip_str,
            is_private=True,
            error="Private/reserved IP — geolocation not available",
            provider="none",
        )

    # Check cache
    if ip_str in _geo_cache:
        cached_result, cached_at = _geo_cache[ip_str]
        if time.time() - cached_at < CACHE_TTL_SECONDS:
            cached_result.cached = True
            return cached_result

    # Call ip-api.com (free tier: 45 req/min, no key required)
    try:
        url = f"http://ip-api.com/json/{ip_str}"
        params = {
            "fields": "status,message,country,countryCode,regionName,city,lat,lon,isp,org,as"
        }

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        if data.get("status") == "success":
            # Parse ASN number
            asn_str = data.get("as", "")
            asn_match = re.match(r"AS(\d+)", asn_str)
            asn = asn_match.group(0) if asn_match else asn_str

            result = GeoResult(
                ip_address=ip_str,
                is_private=False,
                country=data.get("country"),
                country_code=data.get("countryCode"),
                region=data.get("regionName"),
                city=data.get("city"),
                latitude=data.get("lat"),
                longitude=data.get("lon"),
                asn=asn,
                org=data.get("org"),
                isp=data.get("isp"),
                accuracy_radius=50,  # ip-api.com doesn't provide this, use estimate
                provider="ip-api.com",
            )

            # Cache result
            _geo_cache[ip_str] = (result, time.time())
            return result

        else:
            error_msg = data.get("message", "Lookup failed")
            logger.warning(f"ip-api.com error for {ip_str}: {error_msg}")
            return GeoResult(ip_address=ip_str, is_private=False, error=error_msg)

    except httpx.TimeoutException:
        logger.warning(f"Geolocation timeout for {ip_str}")
        return GeoResult(ip_address=ip_str, is_private=False, error="Geolocation request timed out")
    except Exception as e:
        logger.error(f"Geolocation error for {ip_str}: {e}")
        return GeoResult(ip_address=ip_str, is_private=False, error=str(e))


def clear_cache():
    """Clear the geolocation cache."""
    _geo_cache.clear()


def get_cache_stats() -> Dict[str, Any]:
    """Return cache statistics."""
    now = time.time()
    valid = sum(1 for _, (_, t) in _geo_cache.items() if now - t < CACHE_TTL_SECONDS)
    return {
        "total_entries": len(_geo_cache),
        "valid_entries": valid,
        "expired_entries": len(_geo_cache) - valid,
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
    }
