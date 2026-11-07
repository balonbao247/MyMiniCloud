# BÁO CÁO VÀ HƯỚNG DẪN THỰC HIỆN ĐỒ ÁN: XÂY DỰNG MÔ PHỎNG HỆ THỐNG MINICLOUD CƠ BẢN (MyMiniCloud)

---

## MỤC LỤC
1. [Chương 1: Giới thiệu & Mục tiêu hệ thống](#chương-1-giới-thiệu--mục-tiêu-hệ-thống)
2. [Chương 2: Kiến trúc hệ thống & Sơ đồ luồng (Flow Request)](#chương-2-kiến-trúc-hệ-thống--sơ-đồ-luồng-flow-request)
3. [Chương 3: Cấu trúc thư mục & Toàn bộ mã nguồn cấu hình](#chương-3-cấu-trúc-thư-mục--toàn-bộ-mã-nguồn-cấu-hình)
4. [Chương 4: Quy trình khởi chạy & Kiểm thử chi tiết (Local Testing)](#chương-4-quy-trình-khởi-chạy--kiểm-thử-chi-tiết-local-testing)
5. [Chương 5: Thực hiện 10 yêu cầu mở rộng (Đạt điểm tối đa 5.0/5.0)](#chương-5-thực-hiện-10-yêu-cầu-mở-rộng-đạt-điểm-tối-đa-5050)
6. [Chương 6: Đóng gói Docker Hub & Triển khai AWS EC2](#chương-6-đóng-gói-docker-hub--triển-khai-aws-ec2)
7. [Chương 7: Đánh giá, Phân tích & Bảng minh chứng 25 ảnh chụp](#chương-7-đánh-giá-phân-tích--bảng-minh-chứng-25-ảnh-chụp)
8. [Phụ lục & Script tự động hóa](#phụ-lục--script-tự-động-hóa)

---

## CHƯƠNG 1: GIỚI THIỆU & MỤC TIÊU HỆ THỐNG

### 1.1. Đặt vấn đề & Khái niệm Cloud Infrastructure
Trong kỷ nguyên điện toán đám mây hiện đại, các nhà cung cấp như Amazon Web Services (AWS), Google Cloud Platform (GCP) hay Microsoft Azure xây dựng hạ tầng dựa trên kiến trúc microservices và phân tách trách nhiệm (Separation of Concerns). Hệ thống **MyMiniCloud** được thiết kế nhằm mô phỏng lại các khối hạ tầng cốt lõi này bằng công nghệ container hóa (Docker) trên một mạng nội bộ biệt lập (`cloud-net`).

### 1.2. Bảng tổng hợp 9 loại Server bắt buộc và tương đương thực tế
Hệ thống gồm 9 thành phần máy chủ cốt lõi cùng các container phụ trợ:

| STT | Loại Server | Công nghệ sử dụng | Port Host | Port Container | Chức năng & Ánh xạ Cloud thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Web Server** | Nginx (Alpine) | `8080` | `80` | Web Hosting tĩnh (mô phỏng AWS S3 Static Web / Azure Static Apps) |
| 2 | **Application Server** | Python Flask | `8085` | `8081` | REST API Backend & xử lý nghiệp vụ (mô phỏng AWS ECS / Cloud Run) |
| 3 | **Database Server** | MariaDB 11 | `3306` | `3306` | Cơ sở dữ liệu quan hệ RDBMS (mô phỏng Amazon RDS) |
| 4 | **Authentication Server** | Keycloak | `8081` | `8080` | Quản lý định danh IdP & OIDC Token (mô phỏng AWS Cognito) |
| 5 | **Object Storage** | MinIO | `9000`, `9001` | `9000`, `9001` | Lưu trữ file phi cấu trúc tương thích S3 API (mô phỏng Amazon S3) |
| 6 | **DNS Server** | ISC BIND9 | `10053/udp,tcp` | `53/udp,tcp` | Phân giải tên miền nội bộ (mô phỏng AWS Route 53 Private Hosted Zone) |
| 7 | **Monitoring Server** | Prometheus + Node Exporter | `9090`, `9100` | `9090`, `9100` | Thu thập metrics hiệu năng (mô phỏng Amazon CloudWatch Metrics) |
| 8 | **Visualization Server** | Grafana | `3000` | `3000` | Trực quan hóa dashboard giám sát hệ thống |
| 9 | **Reverse Proxy / Gateway** | Nginx | `8088` (Local) / `80` (AWS) | `80` | Định tuyến duy nhất & Cân bằng tải (mô phỏng AWS Application Load Balancer / API Gateway) |

*Ghi chú kỹ thuật:* Node Exporter và Nginx Exporter là hai container bổ trợ metric, do đó hệ sinh thái hoàn chỉnh sẽ bao gồm tổng cộng **12 container** hoạt động đồng thời.

---

## CHƯƠNG 2: KIẾN TRÚC HỆ THỐNG & SƠ ĐỒ LUỒNG (FLOW REQUEST)

### 2.1. Sơ đồ phân tầng hệ thống
Mọi kết nối từ máy khách ngoài (Client / Browser) bắt buộc đi qua tầng Gateway hoặc truy cập các cổng demo theo mô hình:

```
[ Client / Web Browser / PowerShell / curl ]
                     │
                     ▼ (Port 80 / 8088)
         ┌─────────────────────────┐
         │ API Gateway Proxy Server│ (Nginx Reverse Proxy & Load Balancer)
         └───────────┬─────────────┘
                     │ (Mạng Docker: cloud-net)
      ┌──────────────┼───────────────────────────┐
      │ / , /blog/   │ /api/ , /student/         │ /auth/
      ▼              ▼                           ▼
┌──────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│ Web Cluster  │ │ Application Backend     │ │ Authentication Server   │
│ (Web1 & Web2)│ │ (Flask REST API Engine) │ │ (Keycloak OIDC IdP)     │
└──────────────┘ └───────────┬─────────────┘ └─────────────────────────┘
                             │
                             ▼
                 ┌─────────────────────────┐
                 │ Relational Database     │
                 │ (MariaDB: minicloud/db) │
                 └─────────────────────────┘

───────────────────────────────────────────────────────────────────────────
[ Hệ thống dịch vụ phụ trợ nền tảng & Giám sát ]
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐
│ Object Storage   │  │ Internal DNS     │  │ Monitoring Stack        │
│ (MinIO S3 Store) │  │ (BIND9 53/10053) │  │ Prometheus + Exporters  │
│ Console: 9001    │  │ Zone: cloud.local│  │ Grafana: 3000           │
└──────────────────┘  └──────────────────┘  └─────────────────────────┘
```

### 2.2. Luồng xử lý dữ liệu và Routing Rule
* **HTTP `/`**: Reverse Proxy phân bổ lưu lượng theo thuật toán Round Robin qua `web_cluster` gồm `web-frontend-server` và `web-frontend-server2`.
* **HTTP `/blog/`**: Reverse Proxy chuyển tiếp trực tiếp vào `web-frontend-server:80/blog/`.
* **HTTP `/api/*` & `/student`**: Proxy tiến hành strip prefix hoặc route thẳng sang Flask Backend tại cổng nội bộ `8081`.
* **HTTP `/auth/*`**: Proxy định tuyến nguyên vẹn header `Host`, `X-Forwarded-For` vào Keycloak để xác thực không bị mismatch redirect URI.

---

## CHƯƠNG 3: CẤU TRÚC THƯ MỤC & TOÀN BỘ MÃ NGUỒN CẤU HÌNH

### 3.1. Cây thư mục dự án
```text
E:\MyMiniCloud/
├── docker-compose.yml
├── web-frontend-server/
│   ├── Dockerfile
│   ├── conf.default
│   └── html/
│       ├── index.html
│       └── blog/
│           ├── index.html
│           ├── blog1.html
│           ├── blog2.html
│           └── blog3.html
├── web-frontend-server2/
│   ├── Dockerfile
│   └── index.html
├── application-backend-server/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── students.json
│   └── app.py
├── relational-database-server/
│   └── init/
│       └── 001_init.sql
├── object-storage-server/
│   └── data/
├── internal-dns-server/
│   ├── named.conf.options
│   ├── named.conf.local
│   └── db.cloud.local
├── monitoring-prometheus-server/
│   └── prometheus.yml
├── monitoring-grafana-dashboard-server/
└── api-gateway-proxy-server/
    └── nginx.conf
```

---

### 3.2. Nội dung chi tiết từng file cấu hình

#### 1. Web Frontend Server 1
* **File:** `web-frontend-server/Dockerfile`
```dockerfile
FROM nginx:stable-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY conf.default /etc/nginx/conf.d/default.conf
COPY html/ /usr/share/nginx/html/
RUN chmod -R 755 /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

* **File:** `web-frontend-server/conf.default`
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ^~ /blog/ {
        alias /usr/share/nginx/html/blog/;
        index index.html;
        autoindex off;
    }

    # Endpoint phục vụ Prometheus Nginx Exporter
    location /stub_status {
        stub_status;
        allow all;
    }
}
```

* **File:** `web-frontend-server/html/index.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>MyMiniCloud - Home</title>
    <style>
        body { font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f8; }
        .card { background: white; max-width: 500px; margin: auto; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #0066cc; }
        a { display: inline-block; margin-top: 15px; color: #fff; background: #0066cc; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>MyMiniCloud - Web Server 1</h1>
        <p>Chào mừng đến với hệ thống máy chủ tĩnh MyMiniCloud.</p>
        <a href="/blog/">Ghé thăm Blog Cá Nhân</a>
    </div>
</body>
</html>
```

* **File:** `web-frontend-server/html/blog/index.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>MyMiniCloud Blog</title>
    <style>
        body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        ul { list-style: none; padding: 0; }
        li { margin: 15px 0; background: #fafafa; padding: 15px; border-left: 4px solid #0066cc; }
        a { text-decoration: none; color: #0066cc; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Danh sách bài viết - My Personal Blog</h1>
    <ul>
        <li><a href="/blog/blog1.html">1. Xu hướng công nghệ Điện toán Đám mây</a></li>
        <li><a href="/blog/blog2.html">2. Kinh nghiệm học Docker và Microservices</a></li>
        <li><a href="/blog/blog3.html">3. Khám phá văn hóa & Du lịch trải nghiệm</a></li>
    </ul>
    <p><a href="/">← Quay lại Trang Chủ</a></p>
</body>
</html>
```

* **File:** `web-frontend-server/html/blog/blog1.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Công Nghệ Đám Mây</title></head>
<body style="font-family:sans-serif; max-width:650px; margin:40px auto; line-height:1.6;">
    <h1>Xu Hướng Điện Toán Đám Mây</h1>
    <img src="https://picsum.photos/600/250" alt="Tech Cloud" style="border-radius:6px; width:100%;">
    <p>Hệ sinh thái Cloud Native đang dần thay thế toàn bộ kiến trúc máy chủ truyền thống nhờ khả năng tự động hóa và khả năng co giãn linh hoạt.</p>
    <a href="/blog/">← Quay lại danh mục Blog</a>
</body>
</html>
```

* **File:** `web-frontend-server/html/blog/blog2.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Học Docker</title></head>
<body style="font-family:sans-serif; max-width:650px; margin:40px auto; line-height:1.6;">
    <h1>Kinh Nghiệm Làm Chủ Docker</h1>
    <img src="https://picsum.photos/600/251" alt="Docker learning" style="border-radius:6px; width:100%;">
    <p>Container hóa cho phép đóng gói toàn bộ dependencies, đảm bảo môi trường phát triển đồng nhất từ Local đến Cloud.</p>
    <a href="/blog/">← Quay lại danh mục Blog</a>
</body>
</html>
```

* **File:** `web-frontend-server/html/blog/blog3.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Du Lịch</title></head>
<body style="font-family:sans-serif; max-width:650px; margin:40px auto; line-height:1.6;">
    <h1>Du Lịch & Trải Nghiệm</h1>
    <img src="https://picsum.photos/600/252" alt="Travel" style="border-radius:6px; width:100%;">
    <p>Cân bằng giữa công việc kỹ thuật và những chuyến đi giúp mở rộng tư duy giải quyết vấn đề.</p>
    <a href="/blog/">← Quay lại danh mục Blog</a>
</body>
</html>
```

---

#### 2. Web Frontend Server 2 (Phục vụ Load Balancer)
* **File:** `web-frontend-server2/Dockerfile`
```dockerfile
FROM nginx:stable-alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

* **File:** `web-frontend-server2/index.html`
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>MyMiniCloud - Web Server 2</title>
    <style>
        body { font-family: sans-serif; text-align: center; margin-top: 50px; background-color: #eef9f1; }
        .card { background: white; max-width: 500px; margin: auto; padding: 30px; border-radius: 8px; border: 2px solid #28a745; }
        h1 { color: #28a745; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello from Web Server 2 (Load Balanced)</h1>
        <p>Phản hồi từ Node Replica thứ 2 thông qua Nginx Upstream Round-Robin.</p>
    </div>
</body>
</html>
```

---

#### 3. Application Backend Server
* **File:** `application-backend-server/Dockerfile`
```dockerfile
FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py students.json ./
EXPOSE 8081
CMD ["python", "app.py"]
```

* **File:** `application-backend-server/requirements.txt`
```text
flask
requests
python-jose
```

* **File:** `application-backend-server/students.json`
```json
[
  { "id": 1, "name": "Nguyen Van A", "major": "Computer Science", "gpa": 3.8 },
  { "id": 2, "name": "Tran Thi B", "major": "Software Engineering", "gpa": 3.7 },
  { "id": 3, "name": "Le Van C", "major": "Information Technology", "gpa": 3.5 },
  { "id": 4, "name": "Pham Thi D", "major": "Data Science", "gpa": 3.9 },
  { "id": 5, "name": "Hoang Van E", "major": "Cyber Security", "gpa": 3.6 }
]
```

* **File:** `application-backend-server/app.py`
```python
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
```

---

#### 4. Relational Database Server
* **File:** `relational-database-server/init/001_init.sql`
```sql
-- Cấu hình CSDL cơ bản
CREATE DATABASE IF NOT EXISTS minicloud;
USE minicloud;

CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO notes (title) VALUES ('Hello from MariaDB!');

-- Yêu cầu mở rộng 7.3: Database studentdb
CREATE DATABASE IF NOT EXISTS studentdb;
USE studentdb;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL,
    fullname VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    major VARCHAR(50) NOT NULL
);

INSERT INTO students (student_id, fullname, dob, major) VALUES
('SV001', 'Nguyen Van A', '2004-01-15', 'Computer Science'),
('SV002', 'Tran Thi B', '2004-05-20', 'Software Engineering'),
('SV003', 'Le Van C', '2003-12-10', 'Data Science');
```

---

#### 5. Internal DNS Server (BIND9)
* **File:** `internal-dns-server/named.conf.options`
```text
options {
    directory "/var/cache/bind";
    listen-on port 53 { any; };
    listen-on-v6 { none; };
    allow-query { any; };
    recursion yes;
    dnssec-validation no;
};
```

* **File:** `internal-dns-server/named.conf.local`
```text
zone "cloud.local" IN {
    type master;
    file "/etc/bind/db.cloud.local";
};
```

* **File:** `internal-dns-server/db.cloud.local`
```text
$TTL 1H
@ IN SOA ns.cloud.local. admin.cloud.local. (
    2026110301 ; Serial
    1H         ; Refresh
    15M        ; Retry
    1W         ; Expire
    1H         ; Negative Cache TTL
)
@           IN NS ns.cloud.local.
ns          IN A  127.0.0.1

; Ánh xạ bản ghi các service trong MyMiniCloud
web-frontend-server IN A 10.10.10.10
app-backend         IN A 10.10.10.20
minio               IN A 10.10.10.30
keycloak            IN A 10.10.10.40
```

---

#### 6. Monitoring Prometheus Server
* **File:** `monitoring-prometheus-server/prometheus.yml`
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['monitoring-node-exporter-server:9100']

  - job_name: 'web'
    static_configs:
      - targets: ['nginx-exporter:9113']
```

---

#### 7. API Gateway Proxy Server
* **File:** `api-gateway-proxy-server/nginx.conf`
```nginx
events {}

http {
    # Nhóm upstream phục vụ cân bằng tải
    upstream web_cluster {
        server web-frontend-server:80;
        server web-frontend-server2:80;
    }

    server {
        listen 80;

        # Route trang chủ cân bằng tải (Yêu cầu mở rộng 7.10)
        location / {
            proxy_pass http://web_cluster;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Route tĩnh Blog (Server 1)
        location ^~ /blog/ {
            proxy_pass http://web-frontend-server:80/blog/;
            proxy_set_header Host $host;
        }

        # Route Flask Core API (Strip prefix /api/)
        location /api/ {
            proxy_pass http://application-backend-server:8081/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Route Student JSON API (Yêu cầu mở rộng 7.9)
        location /student/ {
            proxy_pass http://application-backend-server:8081/student;
            proxy_set_header Host $host;
        }

        # Route Keycloak IdP
        location /auth {
            proxy_pass http://authentication-identity-server:8080;
            proxy_set_header Host $host:$server_port;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

#### 8. Docker Compose Master File
* **File:** `docker-compose.yml`
```yaml
services:
  web-frontend-server:
    build: ./web-frontend-server
    image: myminicloud-web:latest
    container_name: web-frontend-server
    ports:
      - "8080:80"
    networks:
      - cloud-net
    restart: unless-stopped

  web-frontend-server2:
    build: ./web-frontend-server2
    container_name: web-frontend-server2
    networks:
      - cloud-net
    restart: unless-stopped

  nginx-exporter:
    image: nginx/nginx-prometheus-exporter:1.4.2
    container_name: nginx-exporter
    command:
      - -nginx.scrape-uri=http://web-frontend-server:80/stub_status
    networks:
      - cloud-net
    restart: unless-stopped

  application-backend-server:
    build: ./application-backend-server
    image: myminicloud-app:latest
    container_name: application-backend-server
    ports:
      - "8085:8081"
    environment:
      OIDC_ISSUER: "http://authentication-identity-server:8080/auth/realms/master"
      OIDC_AUDIENCE: "myapp"
    networks:
      - cloud-net
    restart: unless-stopped

  relational-database-server:
    image: mariadb:11
    container_name: relational-database-server
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: minicloud
    volumes:
      - ./relational-database-server/init:/docker-entrypoint-initdb.d:ro
      - mariadb-data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - cloud-net
    restart: unless-stopped

  authentication-identity-server:
    image: quay.io/keycloak/keycloak:latest
    container_name: authentication-identity-server
    command: start-dev
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
      KC_HTTP_ENABLED: "true"
      KC_HTTP_RELATIVE_PATH: /auth
      KC_HOSTNAME_STRICT: "false"
    ports:
      - "8081:8080"
    networks:
      - cloud-net
    restart: unless-stopped

  object-storage-server:
    image: minio/minio:latest
    container_name: object-storage-server
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - ./object-storage-server/data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - cloud-net
    restart: unless-stopped

  internal-dns-server:
    image: internetsystemsconsortium/bind9:9.18
    container_name: internal-dns-server
    ports:
      # Ánh xạ port an toàn tránh xung đột WinNAT / mDNS
      - "10053:53/udp"
      - "10053:53/tcp"
    volumes:
      - ./internal-dns-server/named.conf.options:/etc/bind/named.conf.options:ro
      - ./internal-dns-server/named.conf.local:/etc/bind/named.conf.local:ro
      - ./internal-dns-server/db.cloud.local:/etc/bind/db.cloud.local:ro
    networks:
      - cloud-net
    restart: unless-stopped

  monitoring-node-exporter-server:
    image: prom/node-exporter:latest
    container_name: monitoring-node-exporter-server
    ports:
      - "9100:9100"
    networks:
      - cloud-net
    restart: unless-stopped

  monitoring-prometheus-server:
    image: prom/prometheus:latest
    container_name: monitoring-prometheus-server
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring-prometheus-server/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - cloud-net
    restart: unless-stopped

  monitoring-grafana-dashboard-server:
    image: grafana/grafana:latest
    container_name: monitoring-grafana-dashboard-server
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - cloud-net
    restart: unless-stopped

  api-gateway-proxy-server:
    image: nginx:stable
    container_name: api-gateway-proxy-server
    depends_on:
      - web-frontend-server
      - web-frontend-server2
      - application-backend-server
      - authentication-identity-server
    ports:
      - "8088:80"
    volumes:
      - ./api-gateway-proxy-server/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - cloud-net
    restart: unless-stopped

networks:
  cloud-net:
    name: cloud-net
    driver: bridge

volumes:
  mariadb-data:
  grafana-data:
```

---

## CHƯƠNG 4: QUY TRÌNH KHỞI CHẠY & KIỂM THỬ CHI TIẾT (LOCAL TESTING)

### 4.1. Lệnh build & Khởi động cụm container
Mở PowerShell tại thư mục `E:\MyMiniCloud`:
```powershell
# 1. Kiểm tra cú pháp YAML
docker compose config

# 2. Xây dựng các Docker image tùy biến
docker compose build

# 3. Chạy toàn bộ các container ở chế độ background
docker compose up -d

# 4. Kiểm tra trạng thái toàn bộ dịch vụ
docker compose ps
```
*Kỳ vọng:* Toàn bộ các container chuyển sang trạng thái `Up` hoặc `Running`.

---

### 4.2. Kịch bản xác minh 9 Server cơ bản

#### 1. Web Frontend Server
```powershell
curl.exe -I http://localhost:8080/
curl.exe -I http://localhost:8080/blog/
```
*Kết quả:* Trả về `HTTP/1.1 200 OK`.

#### 2. Application Backend Server
```powershell
curl.exe http://localhost:8085/hello
```
*Kết quả:* `{"message":"Hello from App Server!"}`

#### 3. Relational Database Server
```powershell
docker exec -it relational-database-server mariadb -uroot -proot -e "USE minicloud; SHOW TABLES; SELECT * FROM notes;"
```
*Kết quả:* Hiển thị bảng `notes` chứa dòng chữ `Hello from MariaDB!`.

#### 4. Authentication Server (Keycloak)
* Mở trình duyệt: `http://localhost:8081/auth/`
* Đăng nhập bằng tài khoản: `admin` / `admin`. Giao diện hiển thị bảng quản trị Master realm.

#### 5. Object Storage (MinIO)
* Mở trình duyệt: `http://localhost:9001`
* Đăng nhập bằng tài khoản: `minioadmin` / `minioadmin`.

#### 6. Internal DNS Server
```powershell
Resolve-DnsName -Name web-frontend-server.cloud.local -Server 127.0.0.1 -Port 10053
```
*Kết quả:* Trả về IP Record `10.10.10.10`.

#### 7. Monitoring Prometheus
* Truy cập `http://localhost:9090/targets`
* Kiểm tra target `monitoring-node-exporter-server:9100` hiển thị trạng thái **UP**.

#### 8. Visualization Server (Grafana)
* Mở trình duyệt: `http://localhost:3000` (Tài khoản: `admin` / `admin`).
* Cấu hình Data Source Prometheus với URL: `http://monitoring-prometheus-server:9090`.

#### 9. Reverse Proxy Gateway
```powershell
curl.exe -I http://localhost:8088/
curl.exe http://localhost:8088/api/hello
curl.exe -I http://localhost:8088/auth/
```
*Kết quả:* `/` trả về trang Web; `/api/hello` trả về JSON backend; `/auth/` trả về mã chuyển tiếp HTTP `200` hoặc `302`.

#### 10. Kiểm tra thông mạng nội bộ (Inter-container ping)
```powershell
docker exec -it api-gateway-proxy-server ping -c 2 web-frontend-server
docker exec -it api-gateway-proxy-server ping -c 2 application-backend-server
docker exec -it api-gateway-proxy-server ping -c 2 relational-database-server
```
*Kết quả:* `0% packet loss`.

---

## CHƯƠNG 5: THỰC HIỆN 10 YÊU CẦU MỞ RỘNG (ĐẠT ĐIỂM TỐI ĐA 5.0/5.0)

### 5.1. Mở rộng 1: Web - Blog cá nhân 3 bài viết (+0.5đ)
Đã cấu hình các tệp `blog1.html`, `blog2.html`, `blog3.html` và danh mục liên kết tại `blog/index.html`.
* **Kiểm tra:** Truy cập `http://localhost:8080/blog/blog1.html` trên trình duyệt.

### 5.2. Mở rộng 2: Backend - API danh sách sinh viên (+0.5đ)
* **Kiểm tra trực tiếp:** `curl.exe http://localhost:8085/student`
* **Kiểm tra qua Proxy:** `curl.exe http://localhost:8088/student/`
* **Kết quả:** Trả về danh sách 5 sinh viên cấu trúc JSON.

### 5.3. Mở rộng 3: Database - Khởi tạo CSDL studentdb (+0.5đ)
Chạy câu lệnh truy vấn dữ liệu từ bảng mở rộng:
```powershell
docker exec -it relational-database-server mariadb -uroot -proot -e "SELECT * FROM studentdb.students;"
```
*Kết quả:* Hiển thị danh sách 3 sinh viên (`SV001`, `SV002`, `SV003`).

### 5.4. Mở rộng 4: Keycloak - Tạo Realm, Client & User (+0.5đ)
1. Đăng nhập `http://localhost:8081/auth/`.
2. Tạo Realm mới: Đặt tên theo MSSV (ví dụ: `realm_52300009`).
3. Vào mục **Users** -> Tạo user `sv01` và `sv02`, cấu hình mật khẩu tại thẻ **Credentials**.
4. Vào mục **Clients** -> Tạo client `flask-app`, tắt tính năng **Client Authentication** (Access Type: Public).

### 5.5. Mở rộng 5: MinIO - Upload Avatar & Tài liệu PDF (+0.5đ)
1. Truy cập `http://localhost:9001`.
2. Tạo 2 bucket: `profile-pics` và `documents`.
3. Upload tệp ảnh `avatar.jpg` vào `profile-pics` và tệp `BaoCaoCuoiKy.pdf` vào `documents`.

### 5.6. Mở rộng 6: DNS - Bổ sung đầy đủ bản ghi hệ thống (+0.5đ)
Kiểm tra khả năng phân giải các bản ghi mới bằng PowerShell:
```powershell
Resolve-DnsName -Name app-backend.cloud.local -Server 127.0.0.1 -Port 10053
Resolve-DnsName -Name minio.cloud.local -Server 127.0.0.1 -Port 10053
Resolve-DnsName -Name keycloak.cloud.local -Server 127.0.0.1 -Port 10053
```
*Kết quả:* Trả về lần lượt các địa chỉ IP: `10.10.10.20`, `10.10.10.30`, `10.10.10.40`.

### 5.7. Mở rộng 7: Prometheus - Giám sát Web Server qua Exporter (+0.5đ)
Nhờ container phụ trợ `nginx-exporter:1.4.2` kết nối vào `/stub_status` của Nginx:
* Truy cập `http://localhost:9090/targets`
* Xác minh target `web` (`nginx-exporter:9113`) hiển thị màu xanh và trạng thái **UP**.

### 5.8. Mở rộng 8: Grafana - Thiết lập Dashboard System Health (+0.5đ)
1. Truy cập Grafana `http://localhost:3000`.
2. Tạo Dashboard mới: `System Health of <MSSV>`.
3. Thêm 3 Panels với các truy vấn PromQL:
   * **CPU Usage Panel:**
     ```promql
     100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))
     ```
   * **Memory Usage Panel:**
     ```promql
     100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))
     ```
   * **Network Traffic Panel:**
     ```promql
     rate(node_network_receive_bytes_total[5m])
     ```

### 5.9. Mở rộng 9: API Gateway - Tích hợp Route /student/ (+0.5đ)
Đã cấu hình location block `/student/` trong file `nginx.conf`:
```powershell
curl.exe http://localhost:8088/student/
```
*Kết quả:* Trả về dữ liệu JSON 5 sinh viên thông qua Gateway port 8088.

### 5.10. Mở rộng 10: Load Balancer Round Robin (+0.5đ)
Gửi liên tiếp nhiều request để kiểm tra tính năng cân bằng tải:
```powershell
1..6 | ForEach-Object {
    curl.exe -s http://localhost:8088/ | Select-String "Server"
}
```
*Kết quả:* Nội dung hiển thị luân phiên giữa:
* `<h1>MyMiniCloud - Web Server 1</h1>`
* `<h1>Hello from Web Server 2 (Load Balanced)</h1>`

---

## CHƯƠNG 6: ĐÓNG GÓI DOCKER HUB & TRIỂN KHAI AWS EC2

### 6.1. Đóng gói & Push Image lên Docker Hub
```powershell
# 1. Đăng nhập Docker Hub
docker login

# 2. Gắn tag cho custom image
docker tag myminicloud-web:latest <DOCKERHUB_USERNAME>/myminicloud-web:latest

# 3. Đẩy image lên kho lưu trữ công khai
docker push <DOCKERHUB_USERNAME>/myminicloud-web:latest
```

---

### 6.2. Triển khai toàn diện lên AWS EC2

#### Bước 1: Khởi tạo EC2 Instance
* **Hệ điều hành:** Ubuntu Server 24.04 LTS (x86_64).
* **Instance Type:** `t3.micro` (hoặc `t3.small` nếu có lab cấp phép).
* **Storage:** 20 GB gp3.
* **Security Group Inbound Rules:**
  * Port `22` (SSH): `My IP`
  * Port `80` (HTTP Gateway): `0.0.0.0/0`

#### Bước 2: Cấu hình Swap RAM (Bắt buộc để tránh crash trên t3.micro)
Do `t3.micro` chỉ có 1GB RAM vật lý, cần tạo 2GB Swap Memory để chạy ổn định 12 container:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### Bước 3: Cài đặt Docker & Docker Compose V2 trên Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
*(Thực hiện `exit` và kết nối lại SSH để cập nhật quyền thực thi docker)*

#### Bước 4: Clone Repository & Triển khai
```bash
git clone <URL_REPO_GITHUB_CUA_BAN> MyMiniCloud
cd MyMiniCloud

# Đổi cổng Reverse proxy ra ngoài port 80 chuẩn của EC2
sed -i 's/"8088:80"/"80:80"/g' docker-compose.yml

# Khởi chạy hệ sinh thái
docker compose build
docker compose up -d
docker compose ps
```

#### Bước 5: Kiểm tra nghiệm thu qua Public IP
* Trang chủ Load Balancer: `http://<EC2_PUBLIC_IP>/`
* Blog cá nhân: `http://<EC2_PUBLIC_IP>/blog/`
* API Backend: `http://<EC2_PUBLIC_IP>/api/hello`
* API Danh sách sinh viên: `http://<EC2_PUBLIC_IP>/student/`
* Keycloak Admin: `http://<EC2_PUBLIC_IP>/auth/`

---

## CHƯƠNG 7: ĐÁNH GIÁ, PHÂN TÍCH & BẢNG MINH CHỨNG 25 ẢNH CHỤP

### 7.1. Đánh giá ưu điểm, hạn chế và giải pháp phát triển
* **Ưu điểm:**
  * Toàn bộ 9 loại server được module hóa hoàn chỉnh, dễ dàng bảo trì và di chuyển (Portability).
  * Tiết kiệm chi phí vận hành thông qua việc cô lập mạng ảo `cloud-net` thay vì cấp phát từng máy chủ vật lý riêng biệt.
  * Tích hợp sẵn hệ thống cảnh báo và trực quan hóa hiệu năng theo thời gian thực (Prometheus/Grafana).
* **Hạn chế:**
  * Chạy toàn bộ các thành phần trên một máy chủ đơn lẻ (Single Point of Failure). Nếu node EC2 gặp sự cố, toàn bộ dịch vụ sẽ ngừng hoạt động.
  * Giới hạn tài nguyên phần cứng (đặc biệt là RAM) khi chạy Java Runtime của Keycloak trên hạ tầng micro.
* **Hướng phát triển:**
  * Chuyển đổi file `docker-compose.yml` sang Kubernetes Manifests (Pods, Deployments, StatefulSets, Ingress).
  * Ứng dụng HashiCorp Vault để bảo mật tập trung thông tin nhạy cảm thay vì khai báo biến môi trường plain-text.

---

### 7.2. Danh mục 25 minh chứng ảnh chụp bắt buộc cho báo cáo

| STT | Nhóm minh chứng | Nội dung ảnh chụp cần thể hiện | Trạng thái |
| :---: | :--- | :--- | :---: |
| 1 | **Hạ tầng Docker** | Cấu trúc thư mục dự án trên VS Code hoặc PowerShell (`tree /f`) | [ ] |
| 2 | **Hạ tầng Docker** | Lệnh `docker compose config` chạy không có lỗi cú pháp | [ ] |
| 3 | **Hạ tầng Docker** | Bảng danh sách `docker compose ps` hiển thị đầy đủ container trạng thái `Up` | [ ] |
| 4 | **9 Server cơ bản** | Trình duyệt truy cập `http://localhost:8080/` (Trang Web Home) | [ ] |
| 5 | **9 Server cơ bản** | Trình duyệt truy cập `http://localhost:8080/blog/` (Trang Blog) | [ ] |
| 6 | **9 Server cơ bản** | Terminal chạy `curl http://localhost:8085/hello` nhận JSON thành công | [ ] |
| 7 | **9 Server cơ bản** | Terminal chạy câu lệnh SQL đọc bảng `minicloud.notes` có dòng dữ liệu mẫu | [ ] |
| 8 | **9 Server cơ bản** | Trình duyệt truy cập Keycloak Dashboard `http://localhost:8081/auth/` | [ ] |
| 9 | **9 Server cơ bản** | Giao diện MinIO Console `http://localhost:9001` sau khi đăng nhập thành công | [ ] |
| 10 | **9 Server cơ bản** | Lệnh DNS test phân giải tên miền `web-frontend-server.cloud.local` | [ ] |
| 11 | **9 Server cơ bản** | Giao diện Prometheus Targets hiển thị target `node` trạng thái UP | [ ] |
| 12 | **9 Server cơ bản** | Đăng nhập Grafana và cấu hình thành công Prometheus Data Source | [ ] |
| 13 | **9 Server cơ bản** | Kiểm tra curl qua Reverse Proxy: `/`, `/api/hello` và `/auth/` | [ ] |
| 14 | **Mở rộng (1-5)** | Giao diện blog cá nhân hiển thị bài viết `blog1.html` có ảnh minh họa | [ ] |
| 15 | **Mở rộng (1-5)** | Kết quả curl API `/student` hiển thị danh sách 5 sinh viên | [ ] |
| 16 | **Mở rộng (1-5)** | Kết quả truy vấn SQL `SELECT * FROM studentdb.students;` hiển thị 3 bản ghi | [ ] |
| 17 | **Mở rộng (1-5)** | Giao diện Keycloak hiển thị Realm mới, User `sv01` và Client `flask-app` | [ ] |
| 18 | **Mở rộng (1-5)** | MinIO hiển thị 2 bucket `profile-pics` (có avatar) và `documents` (có PDF) | [ ] |
| 19 | **Mở rộng (6-10)**| Terminal kiểm tra DNS phân giải thành công các bản ghi `app-backend`, `minio` | [ ] |
| 20 | **Mở rộng (6-10)**| Prometheus Targets hiển thị cả 2 target `node` và `web` đều màu xanh UP | [ ] |
| 21 | **Mở rộng (6-10)**| Dashboard Grafana cá nhân `System Health of <MSSV>` với đủ 3 Panels biểu đồ | [ ] |
| 22 | **Mở rộng (6-10)**| Terminal curl endpoint proxy `http://localhost:8088/student/` nhận mảng JSON | [ ] |
| 23 | **Mở rộng (6-10)**| Terminal test Load Balancer hiển thị phản hồi luân phiên Web 1 và Web 2 | [ ] |
| 24 | **Triển khai Cloud**| Giao diện Docker Hub hiển thị Repository chứa image với tag `latest` | [ ] |
| 25 | **Triển khai Cloud**| Bảng điều khiển AWS EC2 đang chạy và truy cập thành công qua Public IPv4 | [ ] |

---

## PHỤ LỤC & SCRIPT TỰ ĐỘNG HÓA

### Script tự động tạo toàn bộ cấu trúc dự án (PowerShell)
Dán đoạn mã script sau vào PowerShell Administrator tại ổ đĩa mong muốn (ví dụ `E:\`):

```powershell
$baseDir = "E:\MyMiniCloud"
New-Item -ItemType Directory -Force -Path `
    "$baseDir\web-frontend-server\html\blog", `
    "$baseDir\web-frontend-server2", `
    "$baseDir\application-backend-server", `
    "$baseDir\relational-database-server\init", `
    "$baseDir\object-storage-server\data", `
    "$baseDir\internal-dns-server", `
    "$baseDir\monitoring-prometheus-server", `
    "$baseDir\monitoring-grafana-dashboard-server", `
    "$baseDir\api-gateway-proxy-server"

Write-Host "Đã khởi tạo thành công cấu trúc thư mục MyMiniCloud chuẩn tại $baseDir" -ForegroundColor Green
```