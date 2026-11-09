# =================================================
#    MYMINICLOUD - FULL SYSTEM AUTOMATED DEMO      
# =================================================

# Tu dong chuyen den thu muc chua docker-compose.yml
Set-Location "E:\MyMiniCloud"

Clear-Host
Write-Host "=================================================" -ForegroundColor Green
Write-Host "   MYMINICLOUD - FULL SYSTEM AUTOMATED DEMO      " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

Write-Host "`n[1] DANH SACH 12 CONTAINER HOAT DONG:" -ForegroundColor Yellow
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n[2] KIEM TRA THONG MANG (PING CLOUD-NET):" -ForegroundColor Yellow
docker exec api-gateway-proxy-server ping -c 2 web-frontend-server | Select-String "packet loss"
docker exec api-gateway-proxy-server ping -c 2 application-backend-server | Select-String "packet loss"
docker exec api-gateway-proxy-server ping -c 2 relational-database-server | Select-String "packet loss"

Write-Host "`n[3] WEB BLOG & API GATEWAY ROUTE:" -ForegroundColor Yellow
curl.exe -s -I http://localhost:8080/blog/ | Select-String "HTTP"
curl.exe -s http://localhost:8088/student/

Write-Host "`n[4] MARIADB DATABASE (STUDENTDB):" -ForegroundColor Yellow
docker exec relational-database-server mariadb -uroot -proot -e "SELECT * FROM studentdb.students;"

Write-Host "[5] INTERNAL DNS (BIND9 ZONE CLOUD.LOCAL):" -ForegroundColor Yellow
docker exec internal-dns-server dig '@127.0.0.1' app-backend.cloud.local minio.cloud.local keycloak.cloud.local +short

Write-Host "`n[6] OBJECT STORAGE (MINIO BUCKETS & FILES):" -ForegroundColor Yellow
docker exec object-storage-server ls -l /data/profile-pics /data/documents

Write-Host "`n[7] LOAD BALANCER ROUND ROBIN (NGINX PROXY):" -ForegroundColor Yellow
1..4 | ForEach-Object {
    $num = $_
    $out = curl.exe -s http://localhost:8088/
    if ($out -like "*Web Server 1*") {
        Write-Host "-> Request $num : Web Server 1 (Chinh)" -ForegroundColor Cyan
    } else {
        Write-Host "-> Request $num : Web Server 2 (Can bang tai)" -ForegroundColor Green
    }
}

Write-Host "`n[8] PROMETHEUS TARGETS & GRAFANA DASHBOARDS:" -ForegroundColor Yellow
Write-Host "Prometheus Targets:" -ForegroundColor Gray
(curl.exe -s http://localhost:9090/api/v1/targets | ConvertFrom-Json).data.activeTargets | Select-Object health, scrapeUrl | Format-Table -AutoSize
Write-Host "Grafana Dashboards:" -ForegroundColor Gray
(curl.exe -s -u admin:admin http://localhost:3000/api/search | ConvertFrom-Json) | Select-Object id, title, uri | Format-Table -AutoSize

Write-Host "================ DEMO HOAN TAT ==================" -ForegroundColor Green
