import os
import json
import time
import requests
from flask import Flask, jsonify, request
from jose import jwt

app = Flask(__name__)

ISSUER = os.getenv("OIDC_ISSUER", "http://authentication-identity-server:8080/realms/master")
AUDIENCE = os.getenv("OIDC_AUDIENCE", "myapp")
JWKS_URL = f"{ISSUER}/protocol/openid-connect/certs"
_JWKS = None
_TS = 0

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

@app.route("/student", methods=["GET"])
def student():
    path = os.path.join(os.path.dirname(__file__), "students.json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

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
