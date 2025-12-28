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

**최우선 작업: 배포 실패 문제 해결**

클로드 코드가 수행해야 할 다음 작업:

1. **deploy.yml 에러 처리 수정** (높은 우선순위)
   - Deploy to Google Compute Engine 단계 실패 시 워크플로우 전체 실패로 표시
   - 에러 로그 명확히 출력
   - 현재: 실패해도 성공으로 보임 → 수정 필요

2. **포트 80 권한 문제 해결** (Critical)
   - 에러: `cannot expose privileged port 80`
   - rootlesskit binary에 CAP_NET_BIND_SERVICE 설정 필요
   - GCE 서버에서 설정 확인 및 수정
   - rootlesskit 경로 확인: `/usr/bin/rootlesskit` 또는 `$HOME/bin/rootlesskit`

3. **배포 재테스트 및 검증**
   - 위 문제 해결 후 배포 재실행
   - `docker compose ps`로 컨테이너 상태 확인
   - nginx config 파일 업데이트 확인
   - 실제 서비스 작동 테스트 (브라우저 접속)

4. **최종 환경 확인**
   - GCE 서버 환경 최종 검증
   - 모든 설정 재확인

5. **install-guide.md** - 전체 프로세스 문서화 (배포 성공 후)

---

**완료된 작업 (진행 중):**
- ✅ GCE 서버 환경 확인 (사용자가 직접 확인)
- ✅ GitHub Secrets 설정 완료
- ✅ GitHub Actions 실행 확인
- ❌ Deploy to Google Compute Engine 단계에서 실패 발견

## 최근 업데이트

### 2025-12-28
- ✅ **nginx-config-generator v2.5 완성**
  - **v2.5**: nginx 서비스명 필수 검증 추가
    - compose.yaml에 monoserver-nginx-main 서비스가 반드시 존재해야 함
    - 없으면 명확한 에러 메시지와 함께 실패
    - test/06-wrong-nginx-service 테스트 케이스 추가 (shouldFail: true)
    - 배포 전 조기 오류 감지로 안정성 향상
  - **v2.4**: nginxServiceName 파라미터 제거 및 monoserver-nginx-main으로 하드코딩
    - deploy.yml과 일관성 확보 (하드코딩된 서비스 이름 사용)
    - CLI 파라미터 3개 → 2개로 축소 (--compose-path, --output-dir)
  - 모든 테스트 통과 (6/6)
  - README.md 및 package.json 업데이트
- 🟢 **GCE 배포 테스트 진행 중**
  - ✅ GCE 서버 환경 확인 완료 (최종 검증은 배포 수정 후)
  - ✅ GitHub Secrets 설정 완료 (GCE_HOST, GCE_USER, GCE_SSH_KEY)
  - ✅ deploy 스크립트 SSH 접속 확인
  - ❌ **배포 실패 문제 발견**:
    1. deploy.yml 에러 처리 문제: 실패해도 워크플로우가 성공으로 표시됨
    2. 포트 80 권한 문제: CAP_NET_BIND_SERVICE 설정 미적용
  - 📝 **Nice To Have**: nginx-conf-generator Docker 이미지화는 불필요하다고 판단
    - tsx 설치가 빠르고 간단함
    - 작업하지 않기로 결정
- 🟢 다음: deploy.yml 에러 처리 수정 → 포트 80 권한 문제 해결 → 배포 재테스트

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
