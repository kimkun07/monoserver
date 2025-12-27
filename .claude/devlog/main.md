# monoserver 개발 진행 상황

> 이 문서는 monoserver 프로젝트의 전체 진행 상황을 관리합니다.
> 클로드 코드는 작업 시작 시 이 파일을 먼저 읽고 어떤 task를 진행해야 할지 확인합니다.

## 프로젝트 개요

**monoserver**는 Git 기반 Docker 컨테이너 자동 배포 시스템입니다. 사용자가 GitHub에서 `compose.yaml`만 수정하고 커밋하면, Google Compute Engine 서버에서 자동으로 컨테이너를 배포하고 Nginx 리버스 프록시를 설정합니다.

## 현재 단계

**Phase 1: 기본 인프라 구축** - 진행 중

## Task 진행 상황

| Task | 상태 | 우선순위 | 파일 |
|------|------|---------|------|
| Nginx Config Generator | ✅ 완료 | P0 | `nginx-conf-generator.md` |
| Docker Rootless 설정 | ✅ 완료 | P0 | `docker-rootless.md` |
| GitHub Actions 워크플로우 | ✅ 완료 (배포 미테스트) | P0 | `github-action.md` |
| Google Compute Engine 설정 | 🟢 진행중 | P0 | `google-compute-engine.md` |
| 설치 가이드 및 스크립트 | 🟡 준비중 | P1 | `install-guide.md` |

### 상태 범례
- 🔴 차단됨 (Blocked)
- 🟡 준비중 (Not Started)
- 🟢 진행중 (In Progress)
- ✅ 완료 (Completed)
- ⏸️ 보류 (On Hold)

## Task 의존성

```
nginx-conf-generator.md (P0) ✅
    ↓
docker-rootless.md (P0) ← 현재 진행중
    ↓
github-action.md (P0)
    ↓
google-compute-engine.md (P0)
    ↓
install-guide.md (P1)
```

**권장 작업 순서:**
1. ✅ `nginx-conf-generator.md` - Nginx 설정 파일 생성 로직 완성
2. 🟢 `docker-rootless.md` - Docker rootless 설치 스크립트 작성 (GCE 서버 설정에 필요)
3. `github-action.md` - Generator를 GitHub Actions에서 실행
4. `google-compute-engine.md` - 서버 설정 및 배포 테스트
5. `install-guide.md` - 전체 프로세스가 검증된 후 문서화

## 다음 작업

**최우선 작업: GCE 서버 설정 및 배포 테스트**

클로드 코드가 수행해야 할 다음 작업:

1. **GCE 서버 설정 확인** - `google-compute-engine.md` 읽고 확인
   - Docker rootless가 설치되어 있는지 확인
   - monoserver 저장소가 clone되어 있는지 확인
   - SSH 접속이 제대로 되는지 확인
   - `~/monoserver` 경로에 프로젝트가 있는지 확인

2. **GitHub Secrets 설정**
   - Repository Settings → Secrets and variables → Actions
   - `GCE_HOST`: GCE 인스턴스의 외부 IP
   - `GCE_USER`: SSH 사용자명
   - `GCE_SSH_KEY`: SSH private key (전체 내용)

3. **main 브랜치에서 배포 테스트**
   - compose.yaml 작은 변경 (예: 주석 추가)
   - commit & push하여 워크플로우 트리거
   - `gh run watch`로 실행 모니터링
   - "Deploy to Google Compute Engine" 단계 주의 깊게 확인

4. **배포 검증**
   - GCE 서버에 SSH 접속
   - `docker compose ps`로 컨테이너 상태 확인
   - nginx config 파일 업데이트 확인
   - 실제 서비스 작동 테스트

5. **install-guide.md** - 전체 프로세스 문서화 (배포 성공 후)

## 최근 업데이트

### 2025-12-27 (저녁)
- ✅ **GitHub Actions 워크플로우 완성 및 main 브랜치 merge**
  - test-github-actions 브랜치 생성
  - 워크플로우 첫 실행 성공 (21초 소요)
  - nginx-config-generator 자동 실행 검증
  - **자동 커밋 기능 완성** ✅
    - compose.yaml 변경 → nginx config 자동 생성 → 자동 커밋
    - echotest.conf 자동 생성 및 push 성공
    - untracked 파일 감지 로직 수정
    - permissions: contents: write 추가
  - test 브랜치에서 GCE 배포 스킵 확인
  - gh CLI 설치 및 워크플로우 모니터링
  - **PR #1 생성 및 main 브랜치로 merge 완료** ✅
- 🟢 다음: GCE 서버 설정 확인 → GitHub Secrets 설정 → 실제 배포 테스트

### 2025-12-27 (오후)
- 🟢 GitHub Actions 워크플로우 생성 (.github/workflows/deploy.yml)
  - nginx-config-generator 자동 실행
  - 생성된 conf.d 파일 자동 커밋
  - GCE에 SSH로 배포
  - docker compose up -d (변경된 서비스만 재시작)
  - nginx reload (무중단 설정 업데이트)
- 🟢 README.md 대폭 업데이트
  - GCE 설정 가이드 상세화 (1-6단계)
  - GitHub 연결 방법 추가
  - Docker rootless 설치 스크립트 안내
  - GitHub Actions SSH 설정 가이드
  - 자동 업데이트 메커니즘 설명 추가
- 🟢 devlog 업데이트 (main.md, github-action.md, google-compute-engine.md)

### 2025-12-27 (오전)
- ✅ CLAUDE.md에 "새로운 Task 시작 프로세스" 섹션 추가
- ✅ docker-rootless.md devlog 파일 생성
- ✅ main.md에 Docker Rootless task 추가 (P0 우선순위)
- ✅ Docker rootless 설치 스크립트 완성 (scripts/install-docker-rootless.sh)
  - 전체 설치 프로세스 자동화
  - CAP_NET_BIND_SERVICE 설정으로 privileged port (80, 443) 바인딩 지원
  - 에러 핸들링 및 검증 포함
  - GCE Ubuntu에서 사용 가능
- 🟢 다음: GitHub Actions 워크플로우 또는 GCE 설정

### 2025-12-26
- ✅ README.md 초안 작성 완료
- ✅ compose.yaml 기본 구조 설정
- ✅ devlog 시스템 구축
- ✅ nginx-conf-generator 완료 (v2.2): 데이터 기반 테스트, 자동 cleanup, 완전한 문서화

## 참고 자료

- 프로젝트 가이드: `/CLAUDE.md`
- 현재 compose.yaml: `/compose.yaml`
- Nginx 설정: `/nginx/nginx.conf`, `/nginx/conf.d/`

## 메모

- Docker는 rootless 모드로 설치 예정
- nginx/conf.d 아래는 자동 생성되므로 수동 편집 금지
- GitHub Actions는 `compose.yaml` 변경 시에만 트리거
