from datetime import datetime, timezone, timedelta
from app.database.database import SessionLocal, engine, Base
from app.database import models
from app.core.security import get_password_hash
from app.core.permissions import ROLE_PERMISSIONS, RoleEnum, PermissionEnum

def seed_database():
    # Ensure tables are created first
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Permissions
        existing_perms = {p.name: p for p in db.query(models.Permission).all()}
        for perm in PermissionEnum:
            if perm.value not in existing_perms:
                new_p = models.Permission(
                    name=perm.value,
                    description=f"Permission to perform {perm.value}",
                    category=perm.value.split(".")[0]
                )
                db.add(new_p)
                existing_perms[perm.value] = new_p
        db.commit()

        # 2. Seed Roles & RolePermissions
        existing_roles = {r.name: r for r in db.query(models.Role).all()}
        for role_enum, perms in ROLE_PERMISSIONS.items():
            role_name = role_enum.value
            role_obj = existing_roles.get(role_name)
            if not role_obj:
                role_obj = models.Role(
                    name=role_name,
                    description=f"{role_name} system role",
                    is_system_role=True
                )
                db.add(role_obj)
                db.flush()
                existing_roles[role_name] = role_obj

            for p_enum in perms:
                perm_obj = existing_perms.get(p_enum.value)
                if perm_obj and perm_obj not in role_obj.permissions:
                    role_obj.permissions.append(perm_obj)
        db.commit()

        # 3. Seed Default Accounts
        users_to_seed = [
            {
                "username": "admin",
                "email": "admin@example.com",
                "password": "Admin123!",
                "full_name": "System Administrator",
                "role": "SUPERADMIN",
            },
            {
                "username": "analyst",
                "email": "analyst@example.com",
                "password": "Analyst123!",
                "full_name": "Security Analyst",
                "role": "ANALYST",
            },
            {
                "username": "user",
                "email": "user@example.com",
                "password": "User123!",
                "full_name": "Standard User",
                "role": "USER",
            },
        ]

        admin_user_id = None
        for u in users_to_seed:
            existing = db.query(models.User).filter_by(username=u["username"]).first()
            if not existing:
                user_obj = models.User(
                    username=u["username"],
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                    is_verified=True,
                )
                db.add(user_obj)
                db.commit()
                db.refresh(user_obj)
                if u["username"] == "admin":
                    admin_user_id = user_obj.id
                print(f"Created user: {u['username']} ({u['role']})")
            else:
                if u["username"] == "admin":
                    admin_user_id = existing.id
                print(f"User already exists: {u['username']}")

        # 4. Seed Default AppSettings
        default_settings = [
            ("simulation_mode", "true", "boolean", "Enables simulation of cyber attacks and autonomous defenses"),
            ("auto_defense_enabled", "true", "boolean", "Automatically deploy firewall rules for critical threats"),
            ("alert_email_enabled", "false", "boolean", "Send automated email alerts on high/critical threats"),
            ("max_login_attempts", "5", "integer", "Account lockout threshold for failed logins"),
            ("quarantine_duration_minutes", "1440", "integer", "Auto-quarantine duration for malicious attacker IPs"),
        ]

        for key, val, val_type, desc in default_settings:
            if not db.query(models.AppSetting).filter_by(key=key).first():
                db.add(models.AppSetting(
                    key=key,
                    value=val,
                    value_type=val_type,
                    description=desc
                ))
        db.commit()

        # 5. Seed Students with format: 1 + College (CK) + Year (21) + Branch (CS) + Roll (045)
        sample_students = [
            {"roll_number": "1CK21CS045", "name": "Rahul Sharma", "year": 2021, "branch": "CS", "sem": 6, "email": "rahul.1ck21cs045@cbit.ac.in"},
            {"roll_number": "1CK21CS012", "name": "Ananya Priya", "year": 2021, "branch": "CS", "sem": 6, "email": "ananya.1ck21cs012@cbit.ac.in"},
            {"roll_number": "1CK22AI019", "name": "Mohammed Zeeshan", "year": 2022, "branch": "AI", "sem": 4, "email": "zeeshan.1ck22ai019@cbit.ac.in"},
            {"roll_number": "1CK23IS007", "name": "Divya Gowda", "year": 2023, "branch": "IS", "sem": 2, "email": "divya.1ck23is007@cbit.ac.in"},
            {"roll_number": "1CK21EC033", "name": "Karthik Reddy", "year": 2021, "branch": "EC", "sem": 6, "email": "karthik.1ck21ec033@cbit.ac.in"},
        ]

        for s_data in sample_students:
            st = db.query(models.Student).filter_by(roll_number=s_data["roll_number"]).first()
            if not st:
                st = models.Student(
                    roll_number=s_data["roll_number"],
                    full_name=s_data["name"],
                    college_code="CK",
                    college_name="C. Byregowda Institute of Technology, Kolar",
                    year=s_data["year"],
                    branch=s_data["branch"],
                    semester=s_data["sem"],
                    email=s_data["email"],
                    phone="9876543210",
                    created_by=admin_user_id
                )
                db.add(st)
                db.flush()

                # Seed sample attendance history
                for i in range(1, 6):
                    att = models.AttendanceRecord(
                        student_id=st.id,
                        roll_number=st.roll_number,
                        date=datetime.now(timezone.utc) - timedelta(days=i),
                        status="PRESENT" if i != 2 else "ABSENT",
                        subject="AI & Cyber Threat Defense",
                        semester=st.semester,
                        marked_by=admin_user_id
                    )
                    db.add(att)
        db.commit()

        # 6. Seed Sample Cyber Crime Dataset Events (Protecting Academic Records)
        if db.query(models.CyberCrimeEvent).count() == 0:
            crimes = [
                models.CyberCrimeEvent(
                    incident_id="CRIME-2026-001",
                    target_type="ATTENDANCE_RECORD",
                    target_identifier="1CK21CS045",
                    attack_type="UNAUTHORIZED_MODIFICATION",
                    source_ip="185.220.101.5",
                    source_location="External Tor Exit Node",
                    user_agent="TamperMonkey/Script-Bot v4.1",
                    payload_details="ATTEMPTED_RECORD_HIJACK: set status='PRESENT' where student_roll='1CK21CS045' and date='2026-10-20'",
                    severity="CRITICAL",
                    risk_score=92.0,
                    defense_action_taken="TRANSACTION_ABORTED_AND_IP_QUARANTINED",
                    is_blocked=True
                ),
                models.CyberCrimeEvent(
                    incident_id="CRIME-2026-002",
                    target_type="DATABASE_SCHEMA",
                    target_identifier="attendance_records",
                    attack_type="SQL_INJECTION",
                    source_ip="103.21.244.12",
                    source_location="Foreign Unverified Proxy",
                    user_agent="sqlmap/1.7#stable",
                    payload_details="UNION SELECT null, username, hashed_password FROM users WHERE roll_number='1CK21CS045'--",
                    severity="CRITICAL",
                    risk_score=98.5,
                    defense_action_taken="INJECTION_FILTERED_AND_IP_BLACKLISTED",
                    is_blocked=True
                ),
                models.CyberCrimeEvent(
                    incident_id="CRIME-2026-003",
                    target_type="STUDENT_RECORD",
                    target_identifier="1CK22AI019",
                    attack_type="UNAUTHORIZED_DELETION",
                    source_ip="45.154.255.89",
                    source_location="Unknown Cloud VPS",
                    user_agent="curl/7.68.0",
                    payload_details="DELETE FROM students WHERE roll_number='1CK22AI019'",
                    severity="HIGH",
                    risk_score=87.0,
                    defense_action_taken="ACCESS_DENIED_ZERO_TRUST_ENFORCED",
                    is_blocked=True
                )
            ]
            for c in crimes:
                db.add(c)
                # Auto add corresponding firewall rule
                if not db.query(models.FirewallRule).filter_by(ip_address=c.source_ip).first():
                    fw = models.FirewallRule(
                        rule_type="IP_BLOCK",
                        ip_address=c.source_ip,
                        action="BLOCK",
                        reason=f"Auto-Defense: {c.attack_type} on {c.target_identifier}",
                        is_active=True
                    )
                    db.add(fw)
            db.commit()

        # 7. Seed Initial ML Model metadata
        if db.query(models.MLModel).count() == 0:
            ml_model = models.MLModel(
                name="CyberThreat_RandomForest_v2",
                version="2.1.0",
                model_type="RandomForestClassifier",
                file_path="app/ml_models/threat_detector.joblib",
                training_dataset="UNSW-NB15 + Academic Cyber Crime Tampering Logs",
                trained_at=datetime.now(timezone.utc) - timedelta(days=2),
                training_status="DEPLOYED",
                is_active=True,
                metrics={
                    "accuracy": 0.984,
                    "precision": 0.978,
                    "recall": 0.989,
                    "f1_score": 0.983,
                    "tamper_detection_rate": "99.2%"
                },
                feature_names=["source_port", "packet_size", "request_rate", "payload_entropy", "role_elevation_score"]
            )
            db.add(ml_model)
            db.commit()

        print("Database seeding completed successfully with students, attendance, and cyber crime datasets.")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
