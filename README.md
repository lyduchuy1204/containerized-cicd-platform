# containerized-cicd-platform

Nen tang CI/CD dung chung cho nhieu project, chay tren Jenkins va deploy len Kubernetes bang kustomize.

Repo nay chua:

- Jenkins shared library gom pipeline va cac class logic dung chung
- Kubernetes manifest theo mo hinh base/overlays cho 3 moi truong dev, staging, prod
- Jenkinsfile rieng cho tung service cua tung project
- docker-compose de dung moi truong local gom Jenkins controller, Jenkins agent va demo application
- script bootstrap Jenkins node, Jenkins job, ECR login va Kubernetes secret

## 1. Kien truc repo

```
docker-compose.yml                aggregator: include jenkins-server va demo app, dinh nghia agent
Jenkinsfile                       job platform-validate
jenkins-server/
  docker-compose.yml              dinh nghia Jenkins controller, JENKINS_HOME bind mount ra host
  README.md                       cach start, stop, backup, nang version controller
platform/
  jenkins/agent/Dockerfile        image agent co docker cli, kubectl, aws cli, git, python3
  pipeline-library/
    vars/                         pipeline: validate, ci, cd, promote, service
    src/com/platform/             logic dung chung, 9 class
projects/
  product-media/
    compose.yml                   demo application chay bang docker compose
    gateway.conf                  nginx gateway cho compose
    services/<service>/           main, ci, promote, cd Jenkinsfile cho tung service
k8s/
  product-media/
    base/                         manifest goc, khong phu thuoc moi truong
    overlays/<env>/               patch rieng cho dev, staging, prod
scripts/
  jenkins-jobs.py                 tao node, tao job, trigger build, doc log qua REST API
  ecr-login.ps1                   login ECR Public tren Windows
  secret.ps1                      tao secret database trong cluster
```

Phan chia `vars/` va `src/`:

- `vars/` chi chua pipeline. Jenkins map moi file trong `vars/` thanh mot global variable nen thu muc con khong duoc ho tro.
- `src/com/platform/` chua toan bo logic. Ba class `PlatformProjects`, `ProjectRegistry`, `ManifestPolicy` la static va `@NonCPS` vi khong goi pipeline step. Nam class `Shell`, `Kubectl`, `DockerImage`, `ImageTag`, `Rollback` nhan `steps` qua constructor vi co goi pipeline step.

## 2. Quy uoc dat ten

| Doi tuong | Quy uoc | Vi du |
| --- | --- | --- |
| Image | `<registry>/<project>/<service>:<tag>` | `public.ecr.aws/e2k8v4q1/product-media/api:dev` |
| Namespace | `<project>-<env>` | `product-media-dev` |
| Label | `app.kubernetes.io/part-of` va `app.kubernetes.io/name` | `part-of: product-media`, `name: api` |
| Job | `<project>-<service>-<kind>` | `product-media-api-ci` |
| Build tag | `b<BUILD_NUMBER>` | `b12` |
| Pointer tag | ten moi truong | `dev`, `staging`, `prod` |

Registry la ECR Public `public.ecr.aws/e2k8v4q1` voi repository `product-media/api`,
`product-media/portal` va `product-media/worker`.

## 3. Chay local

### 3.1 Chuan bi

- Docker Desktop co bat Kubernetes
- kubectl 1.34 tro len, kustomize da tich hop san trong kubectl
- Python 3 de chay `scripts/jenkins-jobs.py`

```
cp .env.example .env
```

### 3.2 Khoi dong Jenkins controller

```
docker compose up -d jenkins
docker compose logs -f jenkins
```

Service `jenkins` duoc dinh nghia trong `jenkins-server/docker-compose.yml` va keo vao bang `include`,
nen chi ton tai o mot cho. `JENKINS_HOME` bind mount ra `jenkins-server/jenkins_home` va bi gitignore.
Thu muc `jenkins-server/` cung chay doc lap duoc, xem README trong do.

Jenkins len o `http://127.0.0.1`. Lan dau can lay mat khau initial admin:

```
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Cai cac plugin sau, bat buoc cho pipeline trong repo nay:

`pipeline-groovy-lib`, `workflow-basic-steps`, `credentials-binding`, `ws-cleanup`, `timestamper`,
`pipeline-input-step`, `pipeline-build-step`, `git`

Khong can khai bao Global Pipeline Library trong UI. Moi Jenkinsfile tu load shared library bang step
`library` voi `modernSCM` va `libraryPath: platform/pipeline-library`. Co the doi nguon library bang
bien moi truong `PLATFORM_LIB_REPO`, `PLATFORM_LIB_VERSION` va `PLATFORM_LIB_PATH`.

### 3.3 Tao Jenkins agent

Tao node roi lay secret:

```
$env:JENKINS_URL='http://127.0.0.1'
$env:JENKINS_USER='admin'
$env:JENKINS_TOKEN='<api-token>'
python scripts/jenkins-jobs.py node
```

Ghi secret vao `JENKINS_AGENT_SECRET` trong `.env`, roi:

```
docker compose up -d --build agent
```

Agent connect bang WebSocket qua `http://jenkins:8080/`, ten node va label deu la `executor-cluster-local`.

Agent container mount `/var/run/docker.sock` de build va push image, mount `~/.kube/config` de chay kubectl.
Vi kubeconfig cua Docker Desktop tro den `https://kubernetes.docker.internal:6443`, compose them
`extra_hosts: kubernetes.docker.internal:host-gateway` de container giai duoc ten nay.

Agent chay bang `user: root` de doc duoc docker socket cua host. Day la danh doi chap nhan duoc cho
moi truong local, moi truong that nen dung docker socket proxy hoac rootless daemon.

Neu muon dung agent native tren Windows thay cho container thi tai `agent.jar` va chay:

```
java -jar agent.jar -url http://127.0.0.1:80/ -secret <secret> -name "executor-cluster-local" -webSocket -workDir "c:\jenkins"
```

Hai cach khong the chay dong thoi vi cung mot ten node. Pipeline khong phu thuoc he dieu hanh, class
`Shell` tu chon `sh` hoac `bat` theo `isUnix()`.

### 3.4 Tao job

```
python scripts/jenkins-jobs.py create
python scripts/jenkins-jobs.py list
```

Lenh nay tao 13 job: `platform-validate` va `product-media-<service>-<kind>` voi service thuoc
api, portal, worker va kind thuoc main, ci, promote, cd.

Job dung `CpsScmFlowDefinition` tro vao Jenkinsfile trong repo nen job la code, khong config bang tay.

Luu y: POST `config.xml` se xoa cac parameter definition ma Jenkins da hoc tu lan build truoc. Build dau
tien sau khi update config phai la build khong tham so. Lenh `build` trong script tu fallback giua
`/build` va `/buildWithParameters` de xu ly viec nay.

### 3.5 Chay demo application bang docker compose

```
docker compose up -d
```

Toan bo stack len gom Jenkins, agent, postgres, redis, api, worker, portal va nginx gateway.
Gateway o `http://127.0.0.1:8080`, api o `http://127.0.0.1:3000`.

Compose cua demo application nam trong `projects/product-media/compose.yml` va duoc keo vao bang
`include` o file root nen khong duplicate noi dung.

### 3.6 Deploy len Kubernetes

Tao secret database truoc, chi tao mot lan cho moi namespace:

```
pwsh scripts/secret.ps1
```

Script sinh password random va khong ghi de secret da co, vi PostgreSQL khoi tao data directory bang
password dau tien nen doi password sau do se lam api khong connect duoc.

Render va kiem tra manifest:

```
kubectl kustomize k8s/product-media/overlays/dev
kubectl apply -k k8s/product-media/overlays/dev --dry-run=server
```

Deploy that thi chay job `product-media-<service>-cd`.

## 4. Luong pipeline

```
product-media-api-main
  |
  +-- platform-validate            render overlay, check manifest policy, server dry run
  +-- product-media-api-ci         clone source, docker build, push b<n> va dev
  +-- product-media-api-cd  dev    apply overlay, rollout restart, cho ready
  +-- product-media-api-promote    tro tag staging vao b<n>
  +-- product-media-api-cd  staging
  +-- input approve
  +-- product-media-api-promote    tro tag prod vao b<n>
  +-- product-media-api-cd  prod
```

| Pipeline | Parameter |
| --- | --- |
| `validatePipeline` | `PROJECT`, `SERVER_DRY_RUN` |
| `ciPipeline` | `PROJECT`, `SERVICE`, `POINTER_TAG`, `PUSH` |
| `cdPipeline` | `PROJECT`, `SERVICE`, `ENVIRONMENT`, `AUTO_ROLLBACK` |
| `promotePipeline` | `PROJECT`, `SERVICE`, `SOURCE_TAG`, `TARGET_TAG` |
| `servicePipeline` | `RUN_VALIDATE`, `DEPLOY_STAGING`, `DEPLOY_PROD` |

Source code application khong nam trong repo nay. Stage checkout cua `ciPipeline` clone tung service repo
vao `.sources/<service>` roi moi build. Repo va ref khai bao trong `PlatformProjects`.

## 5. Chien luoc tag va rollback

Moi lan CI push hai tag len cung mot image:

- `b<BUILD_NUMBER>` bat bien, dung de truy nguyen
- pointer tag `dev`, `staging` hoac `prod`, di chuyen theo thoi gian

Manifest tham chieu pointer tag va dat `imagePullPolicy: Always`. Hai he qua:

- `kubectl apply` la no-op khi chi doi noi dung tag nen `cdPipeline` phai `rollout restart`
- `kubectl rollout undo` khong roll back image duoc vi cac pod template giong nhau

Vi vay rollback lam o muc registry: chay `promotePipeline` voi `SOURCE_TAG` la build tag cu va
`TARGET_TAG` la moi truong can rollback, roi `rollout restart`. Auto rollback trong `cdPipeline` dung
`Rollback.toDigests()` voi digest da capture truoc khi deploy.

## 6. Ghi chu van hanh

- Docker Desktop mac dinh khong co ingress controller. Ingress duoc tao nhung khong route qua `localhost`
  cho den khi cai `ingress-nginx`.
- Chi chay duoc mot moi truong tai mot thoi diem tren cluster local, vi PersistentVolume la cluster-scoped
  va Service `nfs-server` co `clusterIP` co dinh.
- Token cua ECR Public dai 2772 byte, vuot gioi han 2560 byte cua Windows Credential Manager nen
  `docker login` that bai o buoc luu credential. Cach xu ly la ghi `config.json` roi goi
  `docker --config <dir>`, xem `scripts/ecr-login.ps1` va class `DockerImage`.
- `docker push` qua proxy cua Docker Desktop co the dut voi loi `use of closed network connection`.
  `DockerImage` retry 3 lan cach nhau 15 giay va build voi `--provenance=false`.
