# TÀI LIỆU HƯỚNG DẪN & DANH SÁCH LỆNH KIỂM THỬ HỆ THỐNG MYMINICLOUD

* **Đồ án môn học:** Xây dựng mô phỏng hệ thống điện toán đám mây thu nhỏ (MyMiniCloud)
* **Sinh viên thực hiện:** Tôn Lê Gia Bảo
* **Mã số sinh viên (MSSV):** 52300009
* **Giảng viên hướng dẫn:** Thầy Bùi Quý Anh
* **Môi trường thực thi:** Docker & Docker Compose (Windows PowerShell / Linux Terminal)

---

## 📌 BẢNG TỔNG HỢP CỔNG VÀ ĐỊA CHỈ TRUY CẬP (ENDPOINTS)

| STT | Dịch vụ / Máy chủ | Port Host | URL / Endpoint trên Trình duyệt | Tài khoản / Ghi chú |
| :---: | :--- | :---: | :--- | :--- |
| 1 | **API Gateway (Load Balancer)** | `8088` | [http://localhost:8088/](http://localhost:8088/) | Trang chủ cân bằng tải Web 1 & 2 |
| 2 | **Web Blog cá nhân** | `8088` / `8080` | [http://localhost:8088/blog/](http://localhost:8088/blog/) | Blog 3 bài viết chuyên đề |
| 3 | **Application Backend** | `8085` | [http://localhost:8085/hello](http://localhost:8085/hello) | REST API Flask (`/hello`, `/student`, `/secure`) |
| 4 | **Database MariaDB** | `3306` | `localhost:3306` | User: `root` / Pass: `root` |
| 5 | **Authentication Keycloak** | `8081` | [http://localhost:8081/auth/](http://localhost:8081/auth/) | Admin: `admin` / `admin` (Realm: `realm_52300009`) |
| 6 | **Object Storage MinIO** | `9001` | [http://localhost:9001](http://localhost:9001) | User: `minioadmin` / Pass: `minioadmin` |
| 7 | **Monitoring Prometheus** | `9090` | [http://localhost:9090/targets](http://localhost:9090/targets) | Quản lý và theo dõi trạng thái cào metric |
| 8 | **Visualization Grafana** | `3000` | [http://localhost:3000](http://localhost:3000) | Admin: `admin` / `admin` (Dashboard System Health) |
| 9 | **Internal DNS Server** | `10053` | `127.0.0.1:10053` (TCP/UDP) | Zone: `cloud.local` |

---

# PHẦN 1: 10 LỆNH KIỂM THỬ YÊU CẦU CƠ BẢN (CHƯƠNG 4)

### 1. Web Frontend Server (Nginx port 8080)
```powershell
curl.exe -I http://localhost:8080/
```
* **Kỳ vọng:** `HTTP/1.1 200 OK` (Web hosting tĩnh hoạt động).

### 2. Application Backend Server (Flask port 8085)
```powershell
curl.exe -s http://localhost:8085/hello
```
* **Kỳ vọng:** `{"message":"Hello from App Server!"}`

### 3. Relational Database Server (MariaDB port 3306)
```powershell
docker exec relational-database-server mariadb -uroot -proot -e "USE minicloud; SELECT * FROM notes;"
```
* **Kỳ vọng:** Bảng `notes` in ra dòng dữ liệu mẫu: `Hello from MariaDB!`.

### 4. Authentication Server (Keycloak port 8081)
```powershell
curl.exe -s -I http://localhost:8081/auth/
```
* **Kỳ vọng:** `HTTP/1.1 200 OK` hoặc `302 Found`. Mở trình duyệt [http://localhost:8081/auth/](http://localhost:8081/auth/) vào giao diện admin.

### 5. Object Storage (MinIO port 9001)
```powershell
curl.exe -s -I http://localhost:9001
```
* **Kỳ vọng:** `HTTP/1.1 200 OK`. Mở trình duyệt [http://localhost:9001](http://localhost:9001) vào MinIO Console.

### 6. Internal DNS Server (BIND9 port 10053)
```powershell
docker exec internal-dns-server dig '@127.0.0.1' web-frontend-server.cloud.local +short
```
* **Kỳ vọng:** Trả về địa chỉ IP `10.10.10.10`.

### 7. Monitoring Prometheus (Prometheus port 9090)
```powershell
curl.exe -s http://localhost:9090/-/healthy
```
* **Kỳ vọng:** `Prometheus Server is Healthy.`

### 8. Visualization Server (Grafana port 3000)
```powershell
curl.exe -s http://localhost:3000/api/health
```
* **Kỳ vọng:** `{"database":"ok", ...}`

### 9. Reverse Proxy Gateway (Nginx port 8088)
```powershell
curl.exe -s http://localhost:8088/api/hello
```
* **Kỳ vọng:** `{"message":"Hello from App Server!"}` (Gateway định tuyến vào Backend thành công).

### 10. Thông mạng nội bộ (Ping toàn bộ 8 server trong mạng `cloud-net`)
```powershell
@("application-backend-server","relational-database-server","authentication-identity-server","object-storage-server","internal-dns-server","monitoring-prometheus-server","monitoring-grafana-dashboard-server","api-gateway-proxy-server") | ForEach-Object { Write-Host "Ping $_ : " -NoNewline; docker exec web-frontend-server ping -c 1 $_ | Select-String "packet loss" }
```
* **Kỳ vọng:** Tất cả 8 server đều đạt tỉ lệ mất gói: `0% packet loss`.

---

# PHẦN 2: 10 LỆNH KIỂM THỬ YÊU CẦU NÂNG CAO (+5.0 ĐIỂM)

### 1. Mở rộng 1: Web - Blog cá nhân 3 bài viết (+0.5đ)
```powershell
curl.exe -s -I http://localhost:8080/blog/
curl.exe -s -I http://localhost:8080/blog/blog1.html
```
* **Kỳ vọng:** `HTTP/1.1 200 OK`. Mở trình duyệt [http://localhost:8088/blog/](http://localhost:8088/blog/) xem giao diện blog.

### 2. Mở rộng 2: Backend - API danh sách sinh viên JSON (+0.5đ)
```powershell
curl.exe -s http://localhost:8085/student
```
* **Kỳ vọng:** Trả về mảng JSON danh sách 5 sinh viên với đầy đủ `id`, `name`, `major`, `gpa`.

### 3. Mở rộng 3: Database - CSDL `studentdb` & bảng `students` (+0.5đ)
```powershell
docker exec relational-database-server mariadb -uroot -proot -e "SELECT * FROM studentdb.students;"
```
* **Kỳ vọng:** Hiển thị 3 bản ghi sinh viên (`SV001`, `SV002`, `SV003`).

### 4. Mở rộng 4: Keycloak - OIDC JWT Token & Endpoint bảo mật `/secure` (+0.5đ)
```powershell
# 1. Xin cấp Access Token từ Keycloak cho user sv01
$tok = (curl.exe -s -X POST "http://localhost:8081/auth/realms/realm_52300009/protocol/openid-connect/token" -d "client_id=flask-app&grant_type=password&username=sv01&password=1" | ConvertFrom-Json).access_token

# 2. Dùng Token để gọi vào tài nguyên bảo mật /secure trên Flask Backend
curl.exe -s -H "Authorization: Bearer $tok" http://localhost:8085/secure
```
* **Kỳ vọng:** `{"message":"Secure resource OK","preferred_username":"sv01"}`.

### 5. Mở rộng 5: MinIO S3 - Lưu trữ Avatar & Tài liệu PDF (+0.5đ)
```powershell
docker exec object-storage-server mc ls local/profile-pics local/documents
```
* **Kỳ vọng:** Hiển thị 2 tệp: `avatar.jpg` (trong `profile-pics`) và `BaoCaoCuoiKy.pdf` (trong `documents`).

### 6. Mở rộng 6: DNS - Phân giải đầy đủ các bản ghi mở rộng (+0.5đ)
```powershell
docker exec internal-dns-server dig '@127.0.0.1' app-backend.cloud.local minio.cloud.local keycloak.cloud.local +short
```
* **Kỳ vọng:** In ra lần lượt 3 địa chỉ IP nội bộ:
  * `10.10.10.20`
  * `10.10.10.30`
  * `10.10.10.40`

### 7. Mở rộng 7: Prometheus - Giám sát Nginx qua `nginx-exporter` (+0.5đ)
```powershell
(curl.exe -s http://localhost:9090/api/v1/targets | ConvertFrom-Json).data.activeTargets | Select-Object scrapePool, health, scrapeUrl | Format-Table -AutoSize
```
* **Kỳ vọng:** Cả 2 target `node` và `web` đều hiển thị trạng thái `health: up`.

### 8. Mở rộng 8: Grafana - Dashboard System Health (+0.5đ)
```powershell
curl.exe -s -u admin:admin http://localhost:3000/api/search | ConvertFrom-Json | Select-Object id, title, uri | Format-Table -AutoSize
```
* **Kỳ vọng:** Hiển thị Dashboard **`System Health of 52300009`** (Mở trình duyệt [http://localhost:3000](http://localhost:3000) xem 3 biểu đồ CPU, RAM, Network).

### 9. Mở rộng 9: API Gateway - Tích hợp Route `/student/` (+0.5đ)
```powershell
curl.exe -s http://localhost:8088/student/
```
* **Kỳ vọng:** Gateway cổng 8088 định tuyến chuyển tiếp và trả về JSON 5 sinh viên.

### 10. Mở rộng 10: Load Balancer Round Robin (Web 1 vs Web 2) (+0.5đ)
```powershell
1..4 | ForEach-Object { $res = curl.exe -s http://localhost:8088/; if ($res -like "*Web Server 1*") { "Request $_ : Web Server 1" } else { "Request $_ : Web Server 2" } }
```
* **Kỳ vọng:** Kết quả phản hồi luân phiên:
  * `Request 1 : Web Server 1`
  * `Request 2 : Web Server 2`
  * `Request 3 : Web Server 1`
  * `Request 4 : Web Server 2`

---

# PHẦN 3: LỆNH CHẠY TỰ ĐỘNG TOÀN BỘ ĐỂ LẤY LOG NỘP BÁO CÁO

Để kiểm tra toàn bộ hệ thống cùng lúc chỉ bằng **1 lệnh duy nhất** và xuất ra tệp nhật ký `ket_qua_log.txt` dán vào phần **Phụ lục** báo cáo, mở PowerShell và gõ:

```powershell
powershell -ExecutionPolicy Bypass -File "E:\MyMiniCloud\demo_script.ps1" > "E:\MyMiniCloud\ket_qua_log.txt"
```
