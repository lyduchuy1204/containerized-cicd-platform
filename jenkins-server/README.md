# jenkins-server

Jenkins controller chạy bằng Docker Compose. `JENKINS_HOME` được bind mount ra `./jenkins_home` trên ổ đĩa
host, nên container có thể xoá hay đổi image bất cứ lúc nào mà job, build history, credential và cấu hình
vẫn còn.

## Yêu cầu

- Docker Desktop ở chế độ Linux containers, kiểm bằng `docker info --format '{{.OSType}}'`
- Cổng 80 còn trống, hoặc đổi `JENKINS_HTTP_PORT` trong `.env`

## Start

```
cd jenkins-server
cp .env.example .env
docker compose up -d
```

Chờ healthcheck chuyển sang `healthy`, lần đầu mất vài phút vì Jenkins phải giải nén war:

```
docker compose ps
```

## Đăng nhập

| Thông tin | Giá trị |
| --- | --- |
| URL | `http://127.0.0.1/` |
| User | `admin` |
| Password | `admin` |

Đây là credential của môi trường local để chạy demo, không dùng cho môi trường thật.

Nếu `./jenkins_home` còn trống thì Jenkins sẽ chạy setup wizard thay vì cho đăng nhập. Lấy initial admin
password bằng:

```
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Các lệnh thường dùng

```
docker compose logs -f jenkins
docker compose restart jenkins
docker compose stop
docker compose up -d
docker compose down
docker compose up -d --force-recreate
```

`docker compose down` chỉ xoá container, không chạm `./jenkins_home`. Data chỉ mất khi xoá thư mục đó bằng tay.

Kiểm tra nhanh bằng docker CLI:

```
docker inspect -f '{{.State.Health.Status}} {{.RestartCount}}' jenkins-server
docker inspect -f '{{json .Mounts}}' jenkins-server
docker port jenkins-server
docker exec -it jenkins-server bash
```

## Nâng version Jenkins

Đổi `JENKINS_IMAGE` trong `.env` rồi:

```
docker compose pull
docker compose up -d --force-recreate
```

Data không bị ảnh hưởng vì nó không nằm trong image.

## Backup

Dừng container trước để ảnh chụp nhất quán:

```
docker compose stop
Compress-Archive -Path .\jenkins_home\* -DestinationPath "..\jenkins-home-$(Get-Date -f yyyyMMdd).zip"
docker compose up -d
```

## Cấu hình

Mọi biến đều có default, chỉ sửa khi cần. Xem `.env.example`.

| Biến | Default | Ý nghĩa |
| --- | --- | --- |
| `JENKINS_IMAGE` | `jenkins/jenkins:2.568.3-lts-jdk21` | image controller |
| `JENKINS_CONTAINER_NAME` | `jenkins-server` | tên container |
| `JENKINS_HOME_HOST` | `./jenkins_home` | vị trí `JENKINS_HOME` trên host |
| `JENKINS_HTTP_PORT` | `80` | cổng HTTP trên host |
| `JENKINS_AGENT_PORT` | `50000` | cổng JNLP inbound |
| `JENKINS_BIND_IP` | `127.0.0.1` | địa chỉ bind |
| `JENKINS_MEM_LIMIT` | `2g` | giới hạn RAM |
| `RUN_SETUP_WIZARD` | `true` | bật setup wizard lần đầu |
