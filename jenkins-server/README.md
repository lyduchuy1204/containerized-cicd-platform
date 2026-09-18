# jenkins-server

Jenkins controller chay bang Docker Compose. `JENKINS_HOME` duoc bind mount ra `./jenkins_home` tren o dia
host, nen container co the xoa hay doi image bat cu luc nao ma job, build history, credential va cau hinh
van con.

## Yeu cau

- Docker Desktop o che do Linux containers, kiem bang `docker info --format '{{.OSType}}'`
- Cong 80 con trong, hoac doi `JENKINS_HTTP_PORT` trong `.env`

## Start

```
cd jenkins-server
cp .env.example .env
docker compose up -d
```

Cho healthcheck chuyen sang `healthy`, lan dau mat vai phut vi Jenkins phai giai nen war:

```
docker compose ps
```

Lay mat khau initial admin roi mo `http://127.0.0.1` de hoan tat setup wizard:

```
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

## Cac lenh thuong dung

```
docker compose logs -f jenkins
docker compose restart jenkins
docker compose stop
docker compose up -d
docker compose down
docker compose up -d --force-recreate
```

`docker compose down` chi xoa container, khong cham `./jenkins_home`. Data chi mat khi xoa thu muc do bang tay.

Kiem tra nhanh bang docker CLI:

```
docker inspect -f '{{.State.Health.Status}} {{.RestartCount}}' jenkins-server
docker inspect -f '{{json .Mounts}}' jenkins-server
docker port jenkins-server
docker exec -it jenkins-server bash
```

## Nang version Jenkins

Doi `JENKINS_IMAGE` trong `.env` roi:

```
docker compose pull
docker compose up -d --force-recreate
```

Data khong bi anh huong vi no khong nam trong image.

## Backup

Dung container truoc de anh chup nhat quan:

```
docker compose stop
Compress-Archive -Path .\jenkins_home\* -DestinationPath "..\jenkins-home-$(Get-Date -f yyyyMMdd).zip"
docker compose up -d
```

## Cau hinh

Moi bien deu co default, chi sua khi can. Xem `.env.example`.

| Bien | Default | Y nghia |
| --- | --- | --- |
| `JENKINS_IMAGE` | `jenkins/jenkins:2.568.3-lts-jdk21` | image controller |
| `JENKINS_CONTAINER_NAME` | `jenkins-server` | ten container |
| `JENKINS_HOME_HOST` | `./jenkins_home` | vi tri `JENKINS_HOME` tren host |
| `JENKINS_HTTP_PORT` | `80` | cong HTTP tren host |
| `JENKINS_AGENT_PORT` | `50000` | cong JNLP inbound |
| `JENKINS_BIND_IP` | `127.0.0.1` | dia chi bind, chi doi sau khi da co user va password |
| `JENKINS_MEM_LIMIT` | `2g` | gioi han RAM |
| `RUN_SETUP_WIZARD` | `true` | bat setup wizard lan dau |

## Bao mat

- Cong chi bind vao `127.0.0.1`. Truoc khi hoan tat wizard, Jenkins chua co security realm nen bat ky ai
  vao duoc cong 80 la vao duoc wizard. Chi doi `JENKINS_BIND_IP=0.0.0.0` sau khi da co user va password.
- `jenkins_home/` bi gitignore. Trong do co `secret.key` va `secrets/master.key`, la khoa giai ma moi
  credential cua Jenkins. Commit len la lo toan bo credential.
- Khong mount `/var/run/docker.sock` vao controller. Viec build image lam o agent rieng, xem
  `platform/jenkins/agent/Dockerfile` o repo goc.
- Container chay bang uid 1000, khong phai root. Mount 9p cua Docker Desktop trinh bay file la
  `root:root` mode `0777` nen uid 1000 van ghi duoc, khong can `user: root` va khong can `chown`.
- Chua co HTTPS. Chap nhan duoc khi chi nghe tren loopback, mo ra ngoai thi phai co reverse proxy TLS.

## Han che

- Chua co Configuration as Code va chua pin plugin. Cau hinh tao bang setup wizard roi giu trong
  `jenkins_home`, tuc state nam ngoai git.
- Bind mount 9p cham hon filesystem trong VM. Danh doi de data nhin thay va backup duoc tu Windows.
- Backup can dung container. Snapshot nong mot `JENKINS_HOME` dang chay co the ra ban khong nhat quan.

## Buoc tiep theo

Thu muc nay chi dung controller. De co agent, job va pipeline, xem README o repo goc:

- dung agent container: `docker compose up -d --build agent` tu repo goc
- tao node va lay secret: `python scripts/jenkins-jobs.py node`
- tao 13 job: `python scripts/jenkins-jobs.py create`

Compose o repo goc dung `include` de keo file `jenkins-server/docker-compose.yml` nay vao, nen dinh nghia
Jenkins chi ton tai o mot cho.
