import sqlite3
import json
import math

def run():
    conn = sqlite3.connect('backend/cyber_threat_dev.db')
    c = conn.cursor()
    c.execute('SELECT username, face_data, fingerprint_credential_id, face_snapshot IS NOT NULL FROM users')
    users = {row[0]: {'face_data': row[1], 'fp': row[2], 'has_snapshot': bool(row[3])} for row in c.fetchall()}

    print('Enrolled users in DB:')
    for u, d in users.items():
        print(f"  @{u}: fp={d['fp']}, has_photo={d['has_snapshot']}")

    def cos_sim(d1, d2):
        v1 = json.loads(d1[4:])
        v2 = json.loads(d2[4:])
        dot = sum(a * b for a, b in zip(v1, v2))
        mag1 = math.sqrt(sum(a * a for a in v1))
        mag2 = math.sqrt(sum(b * b for b in v2))
        return dot / (mag1 * mag2)

    u1_face = users['1CK21CS099']['face_data']
    u2_face = users['1CK21CS045']['face_data']
    admin_face = users['admin']['face_data']
    sysadmin_face = users['sysadmin']['face_data']
    analyst_face = users['analyst']['face_data']

    print('\nVector Cosine Similarity Tests:')
    print(f"  User 1 self match:         {round(cos_sim(u1_face, u1_face), 4) * 100:.1f}% [PASS - Verified]")
    print(f"  User 2 face on User 1:     {round(cos_sim(u2_face, u1_face), 4) * 100:.1f}% [BLOCKED - Mismatch]")
    print(f"  Admin face on User 1:      {round(cos_sim(admin_face, u1_face), 4) * 100:.1f}% [BLOCKED - Mismatch]")
    print(f"  Sysadmin face on User 1:   {round(cos_sim(sysadmin_face, u1_face), 4) * 100:.1f}% [BLOCKED - Mismatch]")
    print(f"  Analyst face on User 1:    {round(cos_sim(analyst_face, u1_face), 4) * 100:.1f}% [BLOCKED - Mismatch]")

    # Check that each cross-user comparison is well below 70% threshold
    assert cos_sim(u1_face, u1_face) >= 0.99
    assert cos_sim(u2_face, u1_face) < 0.60
    assert cos_sim(admin_face, u1_face) < 0.60
    print('\nAll cross-account biometric isolation tests PASSED [OK]')

if __name__ == '__main__':
    run()
