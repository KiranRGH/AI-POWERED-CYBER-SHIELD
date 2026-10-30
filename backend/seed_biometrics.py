import sqlite3
import math
import json
import urllib.parse

def norm(v):
    mag = math.sqrt(sum(x * x for x in v))
    return [round(x / mag, 4) for x in v]

def make_avatar_svg(name, role, usn, color_hex, role_badge):
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <linearGradient id="grad_{usn}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#131c31"/>
    </linearGradient>
  </defs>
  
  <rect width="320" height="320" rx="24" fill="url(#grad_{usn})" stroke="{color_hex}" stroke-width="3"/>

  <!-- Biometric HUD Targeting Rings -->
  <circle cx="160" cy="135" r="85" fill="none" stroke="{color_hex}" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="4 6"/>
  <circle cx="160" cy="135" r="70" fill="none" stroke="{color_hex}" stroke-width="1.5" stroke-opacity="0.4"/>
  
  <!-- Corner Brackets -->
  <path d="M 75 60 L 60 60 L 60 75" stroke="{color_hex}" stroke-width="2.5" fill="none"/>
  <path d="M 245 60 L 260 60 L 260 75" stroke="{color_hex}" stroke-width="2.5" fill="none"/>
  <path d="M 75 210 L 60 210 L 60 195" stroke="{color_hex}" stroke-width="2.5" fill="none"/>
  <path d="M 245 210 L 260 210 L 260 195" stroke="{color_hex}" stroke-width="2.5" fill="none"/>
  
  <!-- Stylized Face Silhouette -->
  <ellipse cx="160" cy="135" rx="42" ry="52" fill="#1e293b" stroke="{color_hex}" stroke-width="2"/>
  <!-- Eyes -->
  <ellipse cx="144" cy="125" rx="7" ry="4" fill="{color_hex}"/>
  <ellipse cx="176" cy="125" rx="7" ry="4" fill="{color_hex}"/>
  <circle cx="144" cy="125" r="2" fill="#ffffff"/>
  <circle cx="176" cy="125" r="2" fill="#ffffff"/>
  <!-- Nose & Mouth -->
  <path d="M 160 130 L 157 142 L 163 142" stroke="{color_hex}" stroke-width="1.5" fill="none"/>
  <path d="M 150 156 Q 160 162 170 156" stroke="{color_hex}" stroke-width="1.5" fill="none"/>
  <!-- Hair / Crown outline -->
  <path d="M 118 120 C 118 80 202 80 202 120" fill="none" stroke="{color_hex}" stroke-width="2" stroke-dasharray="2 3"/>
  <!-- Shoulders -->
  <path d="M 90 225 Q 160 190 230 225 L 230 240 L 90 240 Z" fill="#0f172a" stroke="{color_hex}" stroke-width="1.5" stroke-opacity="0.6"/>

  <!-- Laser Scan Beam -->
  <line x1="70" y1="135" x2="250" y2="135" stroke="#38bdf8" stroke-width="1.5" stroke-opacity="0.8"/>

  <!-- Badge banner -->
  <rect x="30" y="245" width="260" height="55" rx="10" fill="#0b1120" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  <text x="45" y="268" fill="#f8fafc" font-family="monospace, sans-serif" font-size="13" font-weight="bold">{name}</text>
  <text x="45" y="286" fill="{color_hex}" font-family="monospace, sans-serif" font-size="11" font-weight="600">@{usn}</text>
  
  <rect x="205" y="255" width="75" height="20" rx="6" fill="{color_hex}" fill-opacity="0.2" stroke="{color_hex}" stroke-width="1"/>
  <text x="242" y="269" fill="{color_hex}" font-family="monospace, sans-serif" font-size="9" font-weight="bold" text-anchor="middle">{role_badge}</text>
  
  <text x="160" y="32" fill="{color_hex}" font-family="monospace, sans-serif" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="2">ENROLLED BIOMETRIC ID</text>
</svg>"""
    return 'data:image/svg+xml;utf8,' + urllib.parse.quote(svg)

users_biometrics = [
    {
        'username': 'admin',
        'name': 'Super Administrator',
        'role': 'SUPERADMIN',
        'badge': 'SUPERADMIN',
        'color': '#a855f7', # Purple
        'vector': norm([1.0, 0.95, 0.85, 0.75, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]),
        'fp_id': 'FP_HW_SUPERADMIN_SECURE_TOKEN_001'
    },
    {
        'username': 'sysadmin',
        'name': 'System Administrator',
        'role': 'ADMIN',
        'badge': 'ADMIN',
        'color': '#0ea5e9', # Sky blue
        'vector': norm([0.1, 0.1, 0.1, 0.1, 1.0, 0.95, 0.85, 0.75, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]),
        'fp_id': 'FP_HW_ADMIN_SECURE_TOKEN_002'
    },
    {
        'username': 'analyst',
        'name': 'Security Analyst',
        'role': 'ANALYST',
        'badge': 'ANALYST',
        'color': '#06b6d4', # Cyan
        'vector': norm([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 1.0, 0.95, 0.85, 0.75, 0.2, 0.1, 0.1, 0.1]),
        'fp_id': 'FP_HW_ANALYST_SECURE_TOKEN_003'
    },
    {
        'username': '1CK21CS099',
        'name': 'Kiran (User 1)',
        'role': 'USER',
        'badge': 'STUDENT 1',
        'color': '#10b981', # Emerald
        'vector': norm([0.9, 0.2, 0.1, 0.1, 0.85, 0.2, 0.1, 0.1, 0.9, 0.2, 0.1, 0.1, 0.75, 0.1, 0.1, 0.1]),
        'fp_id': 'FP_HW_USER1_1CK21CS099_TOKEN_004'
    },
    {
        'username': '1CK21CS045',
        'name': 'Student User 2',
        'role': 'USER',
        'badge': 'STUDENT 2',
        'color': '#f59e0b', # Amber / Gold
        'vector': norm([0.1, 0.2, 0.9, 0.1, 0.1, 0.2, 0.85, 0.1, 0.1, 0.2, 0.9, 0.1, 0.1, 0.1, 0.8, 0.1]),
        'fp_id': 'FP_HW_USER2_1CK21CS045_TOKEN_005'
    }
]

def run():
    conn = sqlite3.connect('backend/cyber_threat_dev.db')
    cursor = conn.cursor()

    for u in users_biometrics:
        vec_str = 'VEC:' + json.dumps(u['vector'])
        snapshot = make_avatar_svg(u['name'], u['role'], u['username'], u['color'], u['badge'])
        cursor.execute('''
            UPDATE users 
            SET face_data = ?, face_snapshot = ?, face_registered = 1,
                fingerprint_credential_id = ?, fingerprint_registered = 1
            WHERE username = ?
        ''', (vec_str, snapshot, u['fp_id'], u['username']))
        print(f"Updated user {u['username']} with enrolled biometrics.")

    conn.commit()
    conn.close()
    print('Biometric seeding complete.')

if __name__ == '__main__':
    run()
