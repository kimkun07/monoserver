# monoserver 개발 진행 상황

> 이 문서는 monoserver 프로젝트의 전체 진행 상황을 관리합니다.
> 클로드 코드는 작업 시작 시 이 파일을 먼저 읽고 어떤 task를 진행해야 할지 확인합니다.

## 프로젝트 개요

**monoserver**는 Git 기반 Docker 컨테이너 자동 배포 시스템입니다. 사용자가 GitHub에서 `compose.yaml`만 수정하고 커밋하면, Google Compute Engine 서버에서 자동으로 컨테이너를 배포하고 Nginx 리버스 프록시를 설정합니다.

## 현재 단계

**Phase 1: 기본 인프라 구축** - ✅ 완료

## Task 진행 상황

| Task | 상태 | 우선순위 | 파일 |
|------|------|---------|------|
| Nginx Config Generator | ✅ 완료 (v3.3) | P0 | `nginx-conf-generator.md` |
| Docker Rootless 설정 | ✅ 완료 | P0 | `docker-rootless.md` |
| GitHub Actions 워크플로우 | ✅ 완료 | P0 | `github-action.md` |
| Google Compute Engine 설정 | ✅ 완료 | P0 | `google-compute-engine.md` |
| 설치 가이드 (README.md) | ✅ 완료 | P0 | README.md |

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
docker-rootless.md (P0) ✅
    ↓
github-action.md (P0) ✅
    ↓
google-compute-engine.md (P0) ✅
    ↓
README.md (P0) ✅

Phase 1 완료! 🎉
```

**완료된 작업 순서:**
1. ✅ `nginx-conf-generator.md` - Nginx 설정 파일 생성 로직 완성 (v3.3)
2. ✅ `docker-rootless.md` - Docker rootless 설치 스크립트 작성
3. ✅ `github-action.md` - Generator를 GitHub Actions에서 실행
4. ✅ `google-compute-engine.md` - 서버 설정 및 배포 테스트 완료
5. ✅ `README.md` - 전체 설치 가이드 완성 (path-based routing)

## 다음 작업

**Phase 1 완료! 🎉**

모든 기본 인프라가 구축되었습니다:
- ✅ Path-based routing으로 Nginx 자동 설정
- ✅ Docker rootless 모드로 안전한 컨테이너 실행
- ✅ GitHub Actions 자동 배포 파이프라인
- ✅ GCE 서버에서 실제 배포 검증 완료
- ✅ 완전한 설치 가이드 (README.md)

**현재 상태:**
- compose.yaml 변경 → GitHub push → 자동 배포 → 서비스 즉시 반영
- `http://YOUR_IP/hello/`, `http://YOUR_IP/whoami/` 접속 가능

**향후 개선 가능 사항 (우선순위 낮음):**
- 도메인 연결 및 HTTPS 설정 (Let's Encrypt)
- 모니터링 및 로깅 시스템
- 추가 보안 강화 (방화벽, fail2ban 등)
- 백업 및 복구 전략

---

**Phase 1 달성 내역:**
- ✅ GCE 서버 환경 구축
- ✅ GitHub Secrets 설정
- ✅ GitHub Actions 자동 배포 성공
- ✅ Path-based routing 적용
- ✅ 포트 80 권한 문제 해결
- ✅ Docker bind mount 최적화

## 최근 업데이트

### 2025-12-28
- 🎉 **Phase 1 완료!**
  - GCE 실제 배포 테스트 완료
  - 모든 서비스 정상 작동 확인 (`http://YOUR_IP/hello/`, `/whoami/`)
  - compose.yaml 변경 시 자동 배포 파이프라인 검증 완료
  - 기본 인프라 구축 완료
- ✅ **nginx-config-generator v3.3 완성**
  - nginx.conf와 routes.conf 구조 분리
  - server 블록은 nginx.conf로 이동, routes.conf는 location만 포함
  - 명확한 책임 분리: 인프라 설정 vs 서비스 라우팅
  - README.md 전면 개편: path-based routing 가이드 완성
  - 커밋: 59f52b0
- ✅ **nginx-config-generator v3.2 완성**
  - compose.yaml에서 명시적 bind mount 형식 사용
  - 가독성 향상 및 mount 타입 명확화
  - 커밋: 8a25fad
- ✅ **nginx-config-generator v3.1 완성**
  - root path(/)에 nginx welcome page 추가
  - Docker bind mount 호환성 개선 (rm() 제거, inode 유지)
  - nginx reload만으로 즉시 반영 가능
  - 커밋: 1310b63
- ✅ **nginx-config-generator v3.0 완성** (중요 변경)
  - **Subdomain → Path 기반 라우팅으로 완전 전환**
    - 이전: hello.localhost → 이후: /hello/
  - **파일 구조 대폭 단순화**: conf.d/*.conf → routes.conf 단일 파일
  - DNS 설정 불필요, IP 주소만으로 모든 서비스 접근 가능
  - Breaking Changes: subdomain 방식 사용 불가
  - 커밋: fb16f3b
- ✅ **포트 80 권한 문제 해결**
  - 원인: CAP_NET_BIND_SERVICE 설정 후 docker restart 누락
  - 해결: `systemctl --user restart docker` 실행
  - install-docker-rootless.sh에 docker restart가 이미 포함되어 있음 (라인 201)
  - 수동 restart 후 포트 80 바인딩 성공 확인
- ✅ **GitHub Actions 에러 처리 완성**
  - 포트 80 바인딩 검증 로직 추가
  - `docker compose up -d`가 성공해도 포트 바인딩이 실패하는 경우 감지
  - 워크플로우 실패를 정확히 표시 (테스트 완료, Run #20547284146)
  - 명확한 에러 메시지와 해결 방법 제시
- ✅ **GitHub Actions workflow_dispatch 추가**
  - 수동 트리거 지원: GitHub UI에서 "Run workflow" 버튼으로 실행 가능
  - test-github-actions 브랜치 트리거 제거 (테스트 완료)
  - 디버깅 및 테스트가 더 편리해짐
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
  - ✅ **deploy.yml 에러 처리 수정 완료**
    - `script_stop: true` 추가
    - bash strict mode 설정 (`set -e`, `set -u`, `set -o pipefail`)
    - 각 명령어에 명시적 에러 처리 및 명확한 에러 메시지
    - 이제 배포 실패 시 워크플로우도 실패로 표시됨
  - ❌ **남은 문제**:
    - 포트 80 권한 문제: CAP_NET_BIND_SERVICE 설정 미적용
  - 📝 **Nice To Have**: nginx-conf-generator Docker 이미지화는 불필요하다고 판단
    - tsx 설치가 빠르고 간단함
    - 작업하지 않기로 결정
- 🟢 다음: 포트 80 권한 문제 해결 → 배포 재테스트

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
- 설치 가이드: `/README.md`
- 현재 compose.yaml: `/compose.yaml`
- Nginx 설정: `/nginx/nginx.conf` (수동), `/nginx/routes.conf` (자동 생성)
- Config generator: `/nginx-config-generator/`

## 메모

- ✅ Docker는 rootless 모드로 설치됨 (포트 80 바인딩 가능)
- ⚠️ `nginx/routes.conf`는 자동 생성되므로 수동 편집 금지
- ✅ GitHub Actions는 `compose.yaml` 변경 시 자동 트리거
- ✅ Path-based routing: `/service-name/` 형식으로 접근
