from enum import Enum
from typing import List
from fastapi import Depends, HTTPException, status

class RoleEnum(str, Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    ANALYST = "ANALYST"
    USER = "USER"

class PermissionEnum(str, Enum):
    USERS_READ = "users.read"
    USERS_MANAGE = "users.manage"
    THREATS_READ = "threats.read"
    THREATS_INVESTIGATE = "threats.investigate"
    POLICIES_READ = "policies.read"
    POLICIES_MANAGE = "policies.manage"
    FIREWALL_READ = "firewall.read"
    FIREWALL_APPROVE = "firewall.approve"
    FIREWALL_EXECUTE = "firewall.execute"
    ANALYTICS_READ = "analytics.read"
    REPORTS_EXPORT = "reports.export"
    AUDIT_READ = "audit.read"
    SETTINGS_MANAGE = "settings.manage"
    ROLES_MANAGE = "roles.manage"
    SYSTEM_HEALTH_READ = "system_health.read"

ROLE_PERMISSIONS = {
    RoleEnum.USER: [PermissionEnum.THREATS_READ, PermissionEnum.ANALYTICS_READ],
    RoleEnum.ANALYST: [
        PermissionEnum.THREATS_READ, PermissionEnum.THREATS_INVESTIGATE,
        PermissionEnum.POLICIES_READ, PermissionEnum.FIREWALL_READ,
        PermissionEnum.ANALYTICS_READ, PermissionEnum.REPORTS_EXPORT
    ],
    RoleEnum.ADMIN: [
        PermissionEnum.USERS_READ, PermissionEnum.USERS_MANAGE,
        PermissionEnum.THREATS_READ, PermissionEnum.THREATS_INVESTIGATE,
        PermissionEnum.POLICIES_READ, PermissionEnum.POLICIES_MANAGE,
        PermissionEnum.FIREWALL_READ, PermissionEnum.FIREWALL_APPROVE,
        PermissionEnum.FIREWALL_EXECUTE, PermissionEnum.ANALYTICS_READ,
        PermissionEnum.REPORTS_EXPORT, PermissionEnum.AUDIT_READ,
        PermissionEnum.SETTINGS_MANAGE, PermissionEnum.SYSTEM_HEALTH_READ
    ],
    RoleEnum.SUPERADMIN: list(PermissionEnum)
}

def has_permission(user_role: str, required_permission: str) -> bool:
    try:
        role_enum = RoleEnum(user_role)
        permissions = ROLE_PERMISSIONS.get(role_enum, [])
        return required_permission in [p.value for p in permissions]
    except ValueError:
        return False

class PermissionChecker:
    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    def __call__(self, current_user = Depends()) -> bool:
        # In a real app, current_user is fetched via dependency and injected here
        # E.g. get_current_user
        if not hasattr(current_user, "role"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
        
        if not has_permission(current_user.role, self.required_permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
        return True
