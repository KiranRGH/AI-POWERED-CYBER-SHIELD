from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Text, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.database import Base

class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)

class UserPermission(Base):
    __tablename__ = "user_permissions"
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    granted = Column(Boolean, default=True)
    granted_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(255))
    is_system_role = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    permissions = relationship("Permission", secondary="role_permissions", back_populates="roles")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(String(255))
    category = Column(String(50))
    
    roles = relationship("Role", secondary="role_permissions", back_populates="permissions")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(50), default="USER")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    profile_photo = Column(String(255), nullable=True)
    study_duration = Column(String(50), nullable=True, default="2021 - 2025")
    semester = Column(Integer, nullable=True, default=6)
    unblock_requested = Column(Boolean, default=False)
    unblock_reason = Column(Text, nullable=True)
    unblock_requested_at = Column(DateTime(timezone=True), nullable=True)
    face_data = Column(Text, nullable=True)
    face_registered = Column(Boolean, default=False)
    fingerprint_registered = Column(Boolean, default=False)
    fingerprint_credential_id = Column(String(255), nullable=True)

class PendingRegistration(Base):
    __tablename__ = "pending_registrations"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255))
    full_name = Column(String(100))
    face_data = Column(Text, nullable=True)
    face_registered = Column(Boolean, default=False)
    fingerprint_registered = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

class OTPRecord(Base):
    __tablename__ = "otp_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id_or_email = Column(String(100), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    purpose = Column(String(50))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    refresh_token_hash = Column(String(255), nullable=False)
    device_info = Column(String(255))
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    last_used = Column(DateTime(timezone=True))

class LoginEvent(Base):
    __tablename__ = "login_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email_or_username = Column(String(100))
    ip_address = Column(String(50))
    user_agent = Column(String(255))
    success = Column(Boolean, default=False)
    failure_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NetworkEvent(Base):
    __tablename__ = "network_events"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    source_ip = Column(String(50))
    dest_ip = Column(String(50))
    source_port = Column(Integer)
    dest_port = Column(Integer)
    protocol = Column(String(20))
    bytes_sent = Column(Integer)
    bytes_recv = Column(Integer)
    duration = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    raw_data = Column(Text)
    data_source = Column(String(100))

class ThreatDetection(Base):
    __tablename__ = "threat_detections"
    id = Column(Integer, primary_key=True, index=True)
    network_event_id = Column(Integer, ForeignKey("network_events.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    threat_type = Column(String(100))
    severity = Column(String(50))
    confidence_score = Column(Float)
    risk_score = Column(Float)
    detection_reason = Column(Text)
    is_confirmed = Column(Boolean, default=False)
    investigation_status = Column(String(50), default="PENDING")
    analyst_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    model_version = Column(String(50))
    is_false_positive = Column(Boolean, default=False)
    
    network_event = relationship("NetworkEvent")

class ThreatInvestigation(Base):
    __tablename__ = "threat_investigations"
    id = Column(Integer, primary_key=True, index=True)
    threat_id = Column(Integer, ForeignKey("threat_detections.id", ondelete="CASCADE"))
    investigator_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class IPIntelligence(Base):
    __tablename__ = "ip_intelligence"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), unique=True, index=True)
    is_private = Column(Boolean, default=False)
    country = Column(String(100))
    region = Column(String(100))
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    asn = Column(String(100))
    org = Column(String(100))
    isp = Column(String(100))
    risk_score = Column(Float)
    reputation_flags = Column(JSON)
    source = Column(String(100))
    first_seen = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True))

class GeolocationResult(Base):
    __tablename__ = "geolocation_results"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), index=True)
    country = Column(String(100))
    country_code = Column(String(10))
    region = Column(String(100))
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    asn = Column(String(100))
    org = Column(String(100))
    isp = Column(String(100))
    accuracy_radius = Column(Integer)
    queried_at = Column(DateTime(timezone=True), server_default=func.now())
    provider = Column(String(100))

class ThreatIndicator(Base):
    __tablename__ = "threat_indicators"
    id = Column(Integer, primary_key=True, index=True)
    indicator_type = Column(String(50))
    indicator_value = Column(String(255), index=True)
    source = Column(String(100))
    confidence = Column(Float)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    expires_at = Column(DateTime(timezone=True))
    tags = Column(JSON)
    is_active = Column(Boolean, default=True)

class FirewallRule(Base):
    __tablename__ = "firewall_rules"
    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String(50))
    ip_address = Column(String(50), nullable=True)
    ip_range = Column(String(100), nullable=True)
    port = Column(Integer, nullable=True)
    protocol = Column(String(20), nullable=True)
    action = Column(String(50))
    reason = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    is_temporary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    metadata_ = Column("metadata", JSON)

class DefenseAction(Base):
    __tablename__ = "defense_actions"
    id = Column(Integer, primary_key=True, index=True)
    threat_id = Column(Integer, ForeignKey("threat_detections.id", ondelete="SET NULL"), nullable=True)
    firewall_rule_id = Column(Integer, ForeignKey("firewall_rules.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100))
    status = Column(String(50))
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    policy_id = Column(Integer, nullable=True)
    explanation = Column(Text)
    execution_result = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    executed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_rolled_back = Column(Boolean, default=False)
    rolled_back_at = Column(DateTime(timezone=True), nullable=True)
    rolled_back_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

class AlertRule(Base):
    __tablename__ = "alert_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(Text)
    condition_type = Column(String(50))
    threshold = Column(Float)
    severity = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notification_channels = Column(JSON)
    cooldown_minutes = Column(Integer, default=60)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    title = Column(String(255))
    message = Column(Text)
    severity = Column(String(50))
    notification_type = Column(String(50))
    is_read = Column(Boolean, default=False)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(100))
    action = Column(String(100))
    target_type = Column(String(50))
    target_id = Column(String(100))
    result = Column(String(50))
    ip_address = Column(String(50))
    correlation_id = Column(String(100), nullable=True)
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MLModel(Base):
    __tablename__ = "ml_models"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    version = Column(String(50))
    model_type = Column(String(50))
    file_path = Column(String(255))
    training_dataset = Column(String(255))
    trained_at = Column(DateTime(timezone=True))
    training_status = Column(String(50))
    is_active = Column(Boolean, default=False)
    metrics = Column(JSON)
    feature_names = Column(JSON)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ml_models.id", ondelete="CASCADE"))
    precision_score = Column(Float)
    recall_score = Column(Float)
    f1_score = Column(Float)
    roc_auc = Column(Float)
    accuracy = Column(Float)
    confusion_matrix = Column(JSON)
    evaluation_dataset = Column(String(255))
    evaluated_at = Column(DateTime(timezone=True), server_default=func.now())
    test_size = Column(Float)

class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    description = Column(Text)
    file_path = Column(String(255))
    source = Column(String(100))
    record_count = Column(Integer)
    feature_count = Column(Integer)
    label_distribution = Column(JSON)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    is_processed = Column(Boolean, default=False)
    processing_status = Column(String(50))

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    report_type = Column(String(50))
    generated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parameters = Column(JSON)
    file_path = Column(String(255))
    status = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

class UserPreference(Base):
    __tablename__ = "user_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    theme = Column(String(20), default="system")
    dashboard_layout = Column(JSON)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    email_notifications = Column(Boolean, default=True)
    notification_types = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class AppSetting(Base):
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True)
    value = Column(Text)
    value_type = Column(String(20))
    description = Column(Text)
    is_secret = Column(Boolean, default=False)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SupportRequest(Base):
    __tablename__ = "support_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    subject = Column(String(255))
    description = Column(Text)
    status = Column(String(50), default="OPEN")
    priority = Column(String(20), default="NORMAL")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    admin_notes = Column(Text)

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    description = Column(Text)
    price = Column(Float)
    billing_period = Column(String(20))
    features = Column(JSON)
    max_users = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id", ondelete="RESTRICT"))
    status = Column(String(50))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ==============================================================================
# Academic Database & Cyber Crime Dataset Protection Models
# Target: Student Roll Number format e.g. 1CK21CS045 (1 + College Code CK + Year 21 + Branch CS + Roll 045)
# ==============================================================================

class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    roll_number = Column(String(20), unique=True, index=True, nullable=False) # e.g. 1CK21CS045
    full_name = Column(String(100), nullable=False)
    college_code = Column(String(10), default="CK") # e.g. CK for CBIT Kolar
    college_name = Column(String(150), default="C. Byregowda Institute of Technology, Kolar")
    year = Column(Integer, default=2021)
    branch = Column(String(10), default="CS") # CS, IS, AI, EC, ME, etc.
    semester = Column(Integer, default=6)
    study_duration = Column(String(50), nullable=True, default="2021 - 2025")
    email = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    roll_number = Column(String(20), index=True, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="PRESENT") # PRESENT, ABSENT, LATE, EXCUSED
    subject = Column(String(100), default="AI & Cyber Threat Defense")
    semester = Column(Integer, default=6)
    marked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ip_address = Column(String(50), default="127.0.0.1")
    is_tampered = Column(Boolean, default=False)
    original_status = Column(String(20), nullable=True)
    tampered_by_ip = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student = relationship("Student", back_populates="attendance_records")

class CyberCrimeEvent(Base):
    __tablename__ = "cyber_crime_events"
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. CRIME-2026-8942
    target_type = Column(String(50), nullable=False) # ATTENDANCE_RECORD, STUDENT_RECORD, DATABASE_SCHEMA, SQL_INJECTION
    target_identifier = Column(String(100), nullable=False) # e.g. 1CK21CS045
    attack_type = Column(String(100), nullable=False) # UNAUTHORIZED_MODIFICATION, UNAUTHORIZED_DELETION, SQL_INJECTION, THIRD_PARTY_TAMPERING, DATA_EXFILTRATION
    source_ip = Column(String(50), nullable=False)
    source_location = Column(String(100), default="External Rogue Proxy / Attack Node")
    user_agent = Column(String(255), default="Unknown Attacker Agent / Python-requests")
    payload_details = Column(Text, nullable=False) # Log unauthorized tampering payload or SQL attempt
    severity = Column(String(20), default="HIGH") # CRITICAL, HIGH, MEDIUM, LOW
    risk_score = Column(Float, default=88.5)
    defense_action_taken = Column(String(100), default="BLOCKED_BY_FIREWALL") # BLOCKED_BY_FIREWALL, TRANSACTION_ROLLED_BACK, IP_QUARANTINED
    is_blocked = Column(Boolean, default=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    investigation_status = Column(String(50), default="DEFENSE_ACTIVE")

