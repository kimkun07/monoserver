# Task: Google Compute Engine 설정

## 개요

Google Compute Engine 인스턴스를 monoserver 배포 환경으로 설정하고, GitHub Actions에서 자동 배포가 가능하도록 구성합니다.

## 목표

1. GCE 인스턴스 생성 및 기본 설정
2. Docker rootless 모드 설치
3. SSH 키 기반 인증 설정
4. 방화벽 및 네트워크 구성
5. 배포 테스트 및 검증

## TODO

### Phase 1: GCE 인스턴스 생성
- [ ] Google Cloud Console에서 Compute Engine 인스턴스 생성
  - **머신 타입**: e2-micro (무료 티어) 또는 e2-small
  - **이미지**: Ubuntu 22.04 LTS
  - **부팅 디스크**: 10-20GB
  - **리전**: 한국(asia-northeast3) 또는 가까운 곳
- [ ] 고정 외부 IP 할당 (선택 사항)
- [ ] 방화벽 규칙 생성
  - HTTP (80), HTTPS (443), SSH (22) 허용

### Phase 2: Docker Rootless 설치
- [ ] Rootless Docker 설치 스크립트 실행
- [ ] PATH 및 환경변수 설정
- [ ] Docker 서비스 자동 시작 설정
- [ ] Rootless 모드 검증

### Phase 3: SSH 키 설정
- [ ] GitHub Actions용 SSH 키 생성
- [ ] 공개 키를 authorized_keys에 추가
- [ ] Private 키를 GitHub Secrets에 등록
- [ ] SSH 연결 테스트

### Phase 4: 배포 테스트
- [ ] 저장소 클론
- [ ] docker compose 실행 테스트
- [ ] GitHub Actions에서 배포 테스트
- [ ] 서비스 접속 확인

## 클로드 코드 일기

### 2025-12-28 - 포트 80 권한 문제 원인 발견 및 해결

**상태**: ✅ 해결됨

**진행 내용**:
- **문제**: CAP_NET_BIND_SERVICE가 설정되어 있었지만 포트 80 바인딩이 실패
- **원인 발견**: CAP_NET_BIND_SERVICE 설정 후 docker daemon을 restart하지 않음
  - `setcap cap_net_bind_service=ep $(which rootlesskit)` 실행됨
  - 하지만 설정 적용을 위해 docker restart가 필요했음
- **해결 방법**: `systemctl --user restart docker` 실행 후 포트 80 바인딩 성공

**근본 원인**:
- `scripts/install-docker-rootless.sh`에서 CAP_NET_BIND_SERVICE 설정 후 docker restart를 하지 않음
- setcap 설정은 즉시 적용되지 않고 프로세스 재시작이 필요

**스크립트 수정 필요**:
```bash
# CAP_NET_BIND_SERVICE 설정 후
sudo setcap cap_net_bind_service=ep "$(which rootlesskit)"

# Docker daemon restart 추가 필요
export XDG_RUNTIME_DIR=/run/user/$USERID
systemctl --user restart docker
```

**테스트 결과**:
- ✅ 수동으로 docker restart 실행 후 포트 80 바인딩 성공 확인
- ✅ install-docker-rootless.sh 스크립트 확인: docker restart가 이미 추가되어 있음 (라인 201)
- 🟡 스크립트가 올바르게 실행되었는지 재확인 필요

**다음 단계**:
1. ~~install-docker-rootless.sh에 docker restart 로직 추가~~ (이미 추가되어 있음)
2. deploy.yml 검증 로직 개선 (포트 바인딩 확인)
3. 전체 배포 플로우 재테스트

---

> 다음 클로드 코드에게:
> - **포트 80 문제 해결됨!** docker restart가 핵심이었습니다
> - install-docker-rootless.sh에 docker restart 추가 필요
> - 다음은 전체 배포 플로우 재테스트

### 2025-12-28 - 배포 테스트 중 문제 발견

**상태**: 🟢 진행중 (배포 테스트 단계)

**진행 내용**:
- ✅ GCE 서버 환경 확인 완료 (사용자가 직접 확인)
  - Docker rootless 설치됨
  - monoserver 저장소 clone됨
  - SSH 접속 가능
  - `~/monoserver` 경로 존재
  - ⚠️ **최종 검증은 배포 수정 후 재확인 필요**
- ✅ GitHub Secrets 설정 완료
  - `GCE_HOST`, `GCE_USER`, `GCE_SSH_KEY` 모두 설정됨
  - deploy 스크립트로 SSH 접속 확인됨
- ✅ GitHub Actions 실행 확인
  - 워크플로우 트리거 성공
  - nginx-config-generator 단계 성공
  - ❌ "Deploy to Google Compute Engine" 단계에서 실패

**발견된 문제**:

1. **워크플로우 에러 처리 문제**
   - Deploy to Google Compute Engine 단계가 실패해도 전체 워크플로우가 성공으로 표시됨
   - 에러를 감지하지 못하고 있음
   - 수정 필요: 실패 시 워크플로우 전체 실패로 표시되어야 함

2. **포트 80 권한 문제** (Critical)
   ```
   Error response from daemon: failed to set up container networking:
   driver failed programming external connectivity on endpoint
   monoserver-monoserver-nginx-main-1: error while calling RootlessKit
   PortManager.AddPort(): cannot expose privileged port 80, you can add
   'net.ipv4.ip_unprivileged_port_start=80' to /etc/sysctl.conf
   (currently 1024), or set CAP_NET_BIND_SERVICE on rootlesskit binary,
   or choose a larger port number (>= 1024): listen tcp4 0.0.0.0:80:
   bind: permission denied
   ```
   - rootlesskit binary에 CAP_NET_BIND_SERVICE가 설정되지 않음
   - `scripts/install-docker-rootless.sh`에 설정 로직이 있는데 적용 안 됨
   - 원인 파악 및 수정 필요

**다음 단계**:
1. `.github/workflows/deploy.yml` 수정
   - Deploy 단계 실패 시 워크플로우 전체 실패로 처리
   - 에러 로그 명확히 출력
2. 포트 80 권한 문제 해결
   - GCE 서버에서 CAP_NET_BIND_SERVICE 설정 확인
   - rootlesskit binary 경로 확인
   - 필요 시 스크립트 재실행 또는 수동 설정
3. 배포 재테스트 및 검증
   - docker compose ps 확인
   - nginx config 파일 확인
   - 실제 서비스 접속 테스트

**고려사항**:
- [Nice To Have] nginx-conf-generator Docker 이미지화
  - GitHub Actions에서 tsx가 없는 환경 대비
  - 현재는 불필요한 것으로 판단 (tsx 설치가 빠름)
  - 작업하지 않기로 결정
  - 추후 필요 시 재검토

**블로커**:
- Deploy 단계 에러 처리 수정 필요 (우선순위 높음)
- 포트 80 권한 문제 해결 필요 (Critical)

---

> 다음 클로드 코드에게:
> - **포트 80 권한 문제**: CAP_NET_BIND_SERVICE 설정이 제대로 안 됨
> - **deploy.yml 수정 필요**: 에러 발생 시 워크플로우 실패로 표시되어야 함
> - **rootlesskit 경로 확인**: `/usr/bin/rootlesskit` 또는 `$HOME/bin/rootlesskit` 확인
> - CAP_NET_BIND_SERVICE 설정 스크립트 재실행 또는 수동 설정 필요

### 2025-12-27 - README.md 가이드 작성 완료

**상태**: 🟡 준비중 → 🟢 진행중

**진행 내용**:
- README.md에 GCE 설정 가이드 6단계로 상세 작성
  1. GitHub 연결 (SSH 키 설정)
  2. Repository clone
  3. Docker rootless 설치 (scripts/install-docker-rootless.sh 사용)
  4. GitHub Actions SSH 접근 설정
  5. GitHub Secrets 및 Variables 설정
  6. 초기 배포 및 테스트
- 자동 업데이트 메커니즘 설명 추가
  - compose.yaml 변경 시 자동 업데이트
  - nginx/conf.d 변경 시 무중단 reload
  - 서비스 추가/삭제 시 자동 처리
- 테스트 가이드 작성 (curl 명령어 예시 포함)

**테스트 결과**:
- ⏸️ 실제 GCE 인스턴스에서 테스트 대기중 (사용자가 수행 예정)

**다음 단계**:
1. 사용자가 README.md의 Step 2 (Server Setup) 따라하기
2. Step 3 (GitHub Secrets 설정) 완료
3. Step 4 (초기 배포) 테스트
4. Step 5 (자동 배포) 테스트
5. 문제 발생 시 devlog에 기록 및 수정

**고려사항**:
- Docker rootless 설치 스크립트 이미 완성됨
- Privileged port (80) 바인딩 설정 포함됨
- GitHub Actions SSH 키는 별도로 생성 (보안)
- nginx reload는 무중단으로 설정 변경 적용

**블로커**: 없음 (사용자 테스트 대기)

---

> 다음 클로드 코드에게:
> - README.md 가이드가 완성되었습니다
> - 사용자가 직접 테스트하면서 문제를 발견할 예정
> - 문제 발생 시 여기에 기록하고 README.md 업데이트하세요
> - 특히 권한 문제, 포트 바인딩 문제, SSH 연결 문제를 주의하세요

### 2025-12-26 - 초기 계획 수립

**상태**: 🟡 준비중

**진행 내용**:
- GCE 설정 절차 정리
- Docker rootless 설치 방법 문서화
- SSH 키 설정 절차 명확화

**다음 단계**:
1. GCE 인스턴스 실제 생성 (사용자가 수행)
2. 설치 스크립트 작성 (`install-guide.md`에서)
3. 단계별로 수동 실행하며 문제점 파악
4. 자동화 스크립트로 전환

**고려사항**:
- Rootless Docker에서 포트 80 바인딩 문제 가능성
  - 해결: sysctl 설정 필요
- 메모리 부족 (e2-micro는 1GB)
  - 해결: swap 설정 또는 더 큰 인스턴스

**블로커**:
- GCE 인스턴스가 생성되어야 테스트 가능

---

> 다음 클로드 코드에게:
> - 포트 80 바인딩 문제가 생기면 sysctl 설정을 확인하세요
> - 각 단계를 수동으로 실행하면서 에러가 나면 즉시 devlog에 기록하세요
