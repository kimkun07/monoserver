# Task: Docker Rootless 설정

## 개요

Docker를 rootless 모드로 설치 및 설정합니다. Rootless 모드는 root 권한 없이 Docker를 실행하여 보안을 강화합니다.

## 목표

1. **Docker rootless 설치 스크립트 작성**: Google Compute Engine에서 사용할 수 있는 자동화 스크립트
2. **설치 절차 문서화**: 설치 과정, 요구사항, 제한사항 정리
3. **검증 방법 제공**: 설치 후 정상 작동 확인 방법

## 배경

- monoserver 프로젝트는 보안을 위해 Docker를 rootless 모드로 실행할 예정
- GCE 서버 초기 설정 시 이 스크립트를 실행하여 Docker 환경 구축
- 일반 사용자 권한으로 Docker 컨테이너를 관리

## TODO

### Phase 1: 조사 및 계획
- [x] Docker rootless 공식 문서 조사
- [x] 시스템 요구사항 확인 (Ubuntu/Debian 기준)
- [x] 필요한 패키지 목록 작성
- [x] 설치 절차 정리

### Phase 2: 스크립트 작성
- [x] `scripts/install-docker-rootless.sh` 파일 생성
- [x] 전제조건 체크 로직 추가
- [x] Docker rootless 설치 명령 작성
- [x] 환경 변수 설정 자동화
- [x] 서비스 자동 시작 설정

### Phase 3: 검증 및 문서화
- [x] 테스트 명령 추가 (docker run hello-world 등)
- [x] 스크립트 실행 권한 설정
- [ ] README 또는 설치 가이드에 사용법 추가
- [x] 제한사항 및 주의사항 문서화

## 시스템 요구사항

- Linux 배포판: Ubuntu 20.04 이상 또는 Debian 11 이상
- 커널 버전: 4.18 이상
- 필요한 패키지: `uidmap`, `dbus-user-session`, `fuse-overlayfs` (선택)
- 사용자: 일반 사용자 계정 (non-root)

## 참고 자료

- [Docker 공식 문서: Rootless mode](https://docs.docker.com/engine/security/rootless/)
- [Ubuntu에서 Docker 설치](https://docs.docker.com/engine/install/ubuntu/)

## 스크립트 사용법

### 기본 사용법

```bash
# 1. 일반 사용자로 로그인 (root가 아닌 계정)
# 2. 스크립트 실행
./scripts/install-docker-rootless.sh
```

### 스크립트 기능

1. **환경 체크**: OS 버전 및 사용자 권한 확인
2. **패키지 설치**: uidmap, dbus-user-session, fuse-overlayfs 등
3. **Subordinate UID/GID 설정**: /etc/subuid, /etc/subgid 자동 구성
4. **Docker 설치**: Docker Engine 및 rootless extras 설치
5. **Rootless 설정**: dockerd-rootless-setuptool.sh 실행
6. **환경 변수 설정**: ~/.bashrc에 DOCKER_HOST 등 추가
7. **Systemd 서비스**: 자동 시작 설정
8. **검증**: hello-world 컨테이너로 테스트

### 주의사항

- **root로 실행 금지**: 일반 사용자 계정으로 실행해야 함
- **재로그인 필요**: 설치 후 환경 변수 적용을 위해 재로그인 권장
- **포트 제한**: rootless 모드에서는 1024 이하 포트 바인딩 불가
  - 해결책: 호스트 포트를 1024 이상으로 설정 (예: 8080, 8443)

## 클로드 코드 일기

### 2025-12-27 (2) - 스크립트 작성 완료

**상태**: 🟢 진행중 → ✅ 완료

**진행 내용**:
- ✅ Docker 공식 문서 조사 완료 (docs.docker.com/engine/security/rootless/)
- ✅ scripts/install-docker-rootless.sh 작성 완료
- ✅ 전체 설치 프로세스 자동화:
  - 환경 체크 (OS, 사용자 권한)
  - 필요 패키지 설치 (uidmap, dbus-user-session, fuse-overlayfs, slirp4netns)
  - subuid/subgid 자동 구성
  - Docker Engine 설치
  - Rootless 모드 설정
  - 환경 변수 설정 (~/.bashrc)
  - Systemd 서비스 자동 시작
  - hello-world 컨테이너로 검증
- ✅ 에러 핸들링 및 컬러 로깅 추가
- ✅ 멱등성 보장 (여러 번 실행해도 안전)
- ✅ 실행 권한 설정 (chmod +x)

**성공한 부분**:
- 스크립트가 모든 필수 단계를 자동으로 수행
- 명확한 로깅 및 에러 메시지
- root 실행 방지 로직
- 기존 설치 감지 및 스킵

**다음 단계**:
- README에 사용법 추가 (선택)
- GCE에서 실제 테스트 (google-compute-engine.md task에서)

**고려사항**:
- 포트 1024 미만 바인딩 불가: compose.yaml에서 8080:80 형식으로 설정 필요
- systemd lingering 설정으로 로그아웃 후에도 Docker 데몬 유지
- 환경 변수는 재로그인 후 적용됨

**블로커**: 없음

**테스트 결과**:
- ✅ 스크립트 구문 검사 통과
- ⏸️ 실제 실행 테스트는 GCE 환경에서 수행 예정

---

> 다음 클로드 코드에게:
> - 이 스크립트는 GCE Ubuntu 인스턴스에서 테스트되어야 합니다
> - google-compute-engine.md task에서 이 스크립트를 사용하세요
> - 만약 문제가 발생하면 이 devlog에 기록하고 스크립트 수정하세요
> - compose.yaml의 포트 매핑이 8080:80 형식인지 확인하세요 (rootless는 1024 미만 불가)

### 2025-12-27 (1) - Task 생성 및 초기 계획

**상태**: 🟡 준비중 → 🟢 진행중

**진행 내용**:
- devlog 파일 생성
- 새로운 task 시작 프로세스를 CLAUDE.md에 추가
- TODO 리스트 작성
- 시스템 요구사항 초기 정리

**다음 단계**:
1. Docker rootless 공식 문서 조사 (웹 검색)
2. 설치 스크립트 작성
3. GCE에서 실행 가능하도록 검증

**고려사항**:
- Ubuntu/Debian 기반 시스템을 대상으로 작성
- 에러 핸들링 및 로깅 포함
- 멱등성(idempotent) 보장 - 여러 번 실행해도 안전

**블로커**: 없음
