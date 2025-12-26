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
