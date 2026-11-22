import os
import json
import time
import requests
from flask import Flask, jsonify, request
from jose import jwt

try:
    import pymysql
    import pymysql.cursors
    HAS_PYMYSQL = True
except ImportError:
    HAS_PYMYSQL = False

app = Flask(__name__)

ISSUER = os.getenv("OIDC_ISSUER", "http://authentication-identity-server:8080/auth/realms/realm_52300009")
AUDIENCE = os.getenv("OIDC_AUDIENCE", "account")
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"
_JWKS = None
_TS = 0

DB_HOST = os.getenv("DB_HOST", "relational-database-server")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "minicloud")

def get_db():
    if not HAS_PYMYSQL:
        return None
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
        connect_timeout=3
    )

def get_jwks():
    global _JWKS, _TS
    now = time.time()
    if not _JWKS or (now - _TS > 600):
        try:
            _JWKS = requests.get(JWKS_URL, timeout=5).json()
            _TS = now
        except Exception:
            pass
    return _JWKS

@app.route("/hello", methods=["GET"])
def hello():
    return jsonify({"message": "Hello from App Server!"})

@app.route("/student", methods=["GET", "POST"])
def student():
    path = os.path.join(os.path.dirname(__file__), "students.json")

    if request.method == "POST":
        data = request.get_json(force=True, silent=True) or request.form.to_dict() or {}
        name = data.get("name") or data.get("full_name") or "Sinh viên mới"
        code = data.get("student_code") or data.get("student_id") or f"SV{int(time.time())%10000:04d}"
        major = data.get("major") or "Công nghệ thông tin"
        try:
            gpa = float(data.get("gpa", 3.5))
        except (ValueError, TypeError):
            gpa = 3.5
        email = data.get("email") or f"{code.lower()}@cloud.local"

        # 1. Thử lưu vào MariaDB
        try:
            conn = get_db()
            if conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO students (student_code, full_name, email, major, gpa) VALUES (%s, %s, %s, %s, %s)",
                        (code, name, email, major, gpa)
                    )
                    new_id = cur.lastrowid
                conn.close()
                res = {
                    "id": new_id,
                    "student_code": code,
                    "student_id": code,
                    "name": name,
                    "full_name": name,
                    "email": email,
                    "major": major,
                    "gpa": gpa,
                    "source": "MariaDB"
                }
                return jsonify({"message": "Student created in MariaDB", "student": res}), 201
        except Exception as e:
            app.logger.warning(f"MariaDB insert failed, fallback to json: {e}")

        # 2. Dự phòng: lưu vào file JSON
        try:
            with open(path, "r", encoding="utf-8") as f:
                jdata = json.load(f)
        except Exception:
            jdata = []
        new_id = max([s.get("id", 0) for s in jdata] or [0]) + 1
        new_s = {"id": new_id, "student_id": code, "name": name, "major": major, "gpa": gpa, "email": email, "source": "JSON"}
        jdata.append(new_s)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(jdata, f, indent=2, ensure_ascii=False)
        return jsonify({"message": "Student created in JSON", "student": new_s}), 201

    # GET
    try:
        conn = get_db()
        if conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, student_code, full_name, email, major, CAST(COALESCE(gpa, 3.5) AS FLOAT) as gpa FROM students ORDER BY id ASC")
                rows = cur.fetchall()
            conn.close()
            if rows:
                for r in rows:
                    r["name"] = r["full_name"]
                    r["student_id"] = r["student_code"]
                    r["gpa"] = float(r["gpa"]) if r.get("gpa") is not None else 3.5
                    r["source"] = "MariaDB"
                return jsonify(rows)
    except Exception as e:
        app.logger.warning(f"MariaDB fetch failed, fallback to json: {e}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            jdata = json.load(f)
    except Exception:
        jdata = []
    for s in jdata:
        s["source"] = "JSON"
    return jsonify(jdata)

@app.route("/student/<int:sid>", methods=["PUT", "DELETE"])
def student_detail(sid):
    path = os.path.join(os.path.dirname(__file__), "students.json")

    if request.method == "DELETE":
        # 1. Thử xóa trên MariaDB
        try:
            conn = get_db()
            if conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM students WHERE id = %s", (sid,))
                conn.close()
                return jsonify({"message": "Student deleted from MariaDB", "id": sid, "source": "MariaDB"})
        except Exception as e:
            app.logger.warning(f"MariaDB delete failed: {e}")

        # 2. Dự phòng: xóa trên JSON
        try:
            with open(path, "r", encoding="utf-8") as f:
                jdata = json.load(f)
            jdata = [s for s in jdata if s.get("id") != sid]
            with open(path, "w", encoding="utf-8") as f:
                json.dump(jdata, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
        return jsonify({"message": "Student deleted from JSON", "id": sid, "source": "JSON"})

    if request.method == "PUT":
        data = request.get_json(force=True, silent=True) or request.form.to_dict() or {}
        name = data.get("name") or data.get("full_name")
        code = data.get("student_code") or data.get("student_id")
        major = data.get("major")
        gpa = data.get("gpa")
        email = data.get("email")

        # 1. Thử cập nhật trên MariaDB
        try:
            conn = get_db()
            if conn:
                with conn.cursor() as cur:
                    updates = []
                    vals = []
                    if name: updates.append("full_name=%s"); vals.append(name)
                    if code: updates.append("student_code=%s"); vals.append(code)
                    if major: updates.append("major=%s"); vals.append(major)
                    if gpa is not None:
                        try:
                            vals.append(float(gpa))
                            updates.append("gpa=%s")
                        except ValueError:
                            pass
                    if email: updates.append("email=%s"); vals.append(email)
                    if updates:
                        vals.append(sid)
                        cur.execute(f"UPDATE students SET {', '.join(updates)} WHERE id=%s", vals)
                conn.close()
                return jsonify({"message": "Student updated in MariaDB", "id": sid, "source": "MariaDB"})
        except Exception as e:
            app.logger.warning(f"MariaDB update failed: {e}")

        # 2. Dự phòng: cập nhật file JSON
        try:
            with open(path, "r", encoding="utf-8") as f:
                jdata = json.load(f)
            for s in jdata:
                if s.get("id") == sid:
                    s.update(data)
                    break
            with open(path, "w", encoding="utf-8") as f:
                json.dump(jdata, f, indent=2, ensure_ascii=False)
        except Exception:
            pass
        return jsonify({"message": "Student updated in JSON", "id": sid, "source": "JSON"})

@app.route("/secure", methods=["GET"])
def secure():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "Missing Bearer token"}), 401
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, get_jwks(), algorithms=["RS256"], audience=AUDIENCE, issuer=ISSUER)
        return jsonify({
            "message": "Secure resource OK",
            "preferred_username": payload.get("preferred_username")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 401

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081)
