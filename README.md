# MyMiniCloud - Basic Cloud Infrastructure Simulation

Hệ thống mô phỏng hạ tầng điện toán đám mây thu nhỏ (**MyMiniCloud**) sử dụng kiến trúc Microservices và Container hóa (Docker & Docker Compose). Hệ sinh thái bao gồm 12 containers với 9 loại máy chủ cốt lõi cùng các exporter giám sát và gateway cân bằng tải.

---

## 🏛️ Kiến trúc hệ thống & Danh mục Máy chủ

| STT | Máy chủ | Công nghệ | Port Host | Port Container | Chức năng & Ánh xạ Cloud thực tế |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Web Server 1 & 2** | Nginx (Alpine) | `8080` | `80` | Web Hosting tĩnh & Cụm cân bằng tải (AWS S3 Static Web) |
| 2 | **Application Server** | Python Flask | `8085` | `8081` | REST API Backend & OIDC JWT Auth (AWS ECS / Cloud Run) |
| 3 | **Database Server** | MariaDB 11 | `3306` | `3306` | RDBMS với database `minicloud` & `studentdb` (Amazon RDS) |
| 4 | **Authentication Server** | Keycloak | `8081` | `8080` | IdP, OAuth2.0 & OpenID Connect (AWS Cognito) |
| 5 | **Object Storage** | MinIO | `9000`, `9001` | `9000`, `9001` | Lưu trữ file phi cấu trúc chuẩn S3 API (Amazon S3) |
| 6 | **Internal DNS Server** | ISC BIND9 | `10053/udp,tcp` | `53/udp,tcp` | Phân giải tên miền vùng `cloud.local` (AWS Route 53) |
| 7 | **Monitoring Server** | Prometheus + Exporters | `9090`, `9100`, `9113` | - | Thu thập chỉ số hiệu năng (AWS CloudWatch Metrics) |
| 8 | **Visualization Server** | Grafana | `3000` | `3000` | Trực quan hóa Dashboard hệ thống thời gian thực |
| 9 | **API Gateway / Proxy** | Nginx | `8088` (Local) / `80` (AWS) | `80` | Reverse Proxy & Round Robin Load Balancer (AWS ALB) |

---

## 🚀 Hướng dẫn khởi chạy nhanh (Quick Start)

### 1. Yêu cầu tiên quyết
- Cài đặt **Docker** và **Docker Compose v2**.
- Đảm bảo các cổng không bị xung đột trên host.

### 2. Khởi chạy toàn bộ hệ thống
```bash
# Clone dự án
git clone https://github.com/balonbao247/MyMiniCloud.git
cd MyMiniCloud

# Xây dựng và khởi chạy container
docker compose up -d --build

# Kiểm tra trạng thái các container
docker compose ps
```

---

## 🔍 Kiểm thử & Endpoint truy cập

- **Web Gateway (Load Balancer):** [http://localhost:8088/](http://localhost:8088/)
- **Blog Cá Nhân:** [http://localhost:8088/blog/](http://localhost:8088/blog/)
- **API Danh sách Sinh viên:** [http://localhost:8088/student/](http://localhost:8088/student/)
- **Keycloak Admin Console:** [http://localhost:8081/auth/](http://localhost:8081/auth/) (admin / admin)
- **MinIO Object Storage Console:** [http://localhost:9001](http://localhost:9001) (minioadmin / minioadmin)
- **Prometheus Targets:** [http://localhost:9090/targets](http://localhost:9090/targets)
- **Grafana Dashboard:** [http://localhost:3000](http://localhost:3000) (admin / admin)

---

## 🛠️ Yêu cầu mở rộng đã hoàn thành (10/10)
1. ✅ **Web:** Blog cá nhân với 3 bài viết chuyên đề.
2. ✅ **Backend:** Endpoint REST API `/student` trả về danh sách sinh viên JSON.
3. ✅ **Database:** CSDL `studentdb` với bảng `students`.
4. ✅ **Keycloak:** Cấu hình Realm, Client Public `flask-app`, cấp quyền OIDC Token cho user.
5. ✅ **MinIO:** Buckets `profile-pics` và `documents` lưu trữ avatar và tài liệu PDF.
6. ✅ **DNS:** Bản ghi phân giải `app-backend`, `minio`, `keycloak` trong zone `cloud.local`.
7. ✅ **Prometheus:** Giám sát Web Server thông qua `nginx-exporter`.
8. ✅ **Grafana:** Dashboard System Health với các chỉ số CPU, RAM, Network Traffic.
9. ✅ **Gateway:** Định tuyến route `/student/` thông qua Reverse Proxy.
10. ✅ **Load Balancing:** Thuật toán Round Robin luân phiên giữa Web 1 và Web 2.

