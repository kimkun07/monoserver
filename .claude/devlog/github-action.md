# Task: GitHub Actions 워크플로우

## 개요

GitHub에 `compose.yaml` 변경사항이 커밋되면 자동으로 실행되는 CI/CD 파이프라인을 구축합니다. 세 가지 주요 작업을 수행합니다.

## 목표

1. **Docker Compose Linter 실행**: `compose.yaml` 유효성 검증
2. **Nginx Config Generator 실행**: Nginx 설정 파일 자동 생성
3. **Google Compute Engine에 배포**: SSH로 서버에 접속하여 배포 명령 실행

## 워크플로우 파일

**경로**: `.github/workflows/deploy.yml`

## TODO

### Phase 1: 기본 워크플로우
- [ ] `.github/workflows/` 디렉토리 생성
- [ ] `deploy.yml` 파일 작성
- [ ] Trigger 설정 (compose.yaml, nginx/**, workflow 파일 변경 시)
- [ ] Job 구조 설계 (lint → generate → deploy)

### Phase 2: Lint Job
- [ ] Docker Compose validator 설정
  - 옵션 1: `docker compose config` 사용
  - 옵션 2: `hadolint` 같은 전문 linter
- [ ] 에러 발생 시 워크플로우 중단
- [ ] 검증 결과 출력

### Phase 3: Generate Job
- [ ] nginx-conf-generator 스크립트 실행
- [ ] 생성된 파일을 Git에 커밋 (옵션)
  - 옵션 A: 자동 커밋 후 push
  - 옵션 B: PR로 검토 후 병합
  - 옵션 C: 서버에서 직접 생성 (커밋 안 함)
- [ ] 생성 실패 시 에러 처리

### Phase 4: Deploy Job
- [ ] SSH 연결 설정 (appleboy/ssh-action)
- [ ] Secrets 설정 필요 항목 문서화
- [ ] 배포 스크립트 작성
  - `git pull`
  - Nginx config 재생성 (서버에서)
  - `docker compose down && docker compose up -d`
  - `docker compose ps` 로 상태 확인
- [ ] 배포 실패 시 롤백 로직 (선택)

### Phase 5: 알림 및 모니터링
- [ ] 배포 성공/실패 알림 (Slack, Discord, 이메일 등)
- [ ] 배포 로그 저장 (Artifacts)
- [ ] 배포 기록 관리 (Release notes)

## Secrets 설정 필요 항목

GitHub Repository Settings → Secrets and variables → Actions에 추가:

| Secret 이름 | 설명 | 예시 |
|------------|------|------|
| `GCE_HOST` | Compute Engine 외부 IP | `34.123.456.78` |
| `GCE_USER` | SSH 사용자 이름 | `simelvia` |
| `GCE_SSH_KEY` | SSH private key | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## 클로드 코드 일기

### 2025-12-26 - 초기 계획 수립

**상태**: 🟡 준비중

**진행 내용**:
- 워크플로우 구조 설계 완료
- 3단계 Job 구조 결정 (lint → generate → deploy)
- Secrets 필요 항목 정리
- 설계 옵션 검토 및 초기 선택 완료

**다음 단계**:
1. nginx-conf-generator가 완성되면 워크플로우 파일 작성
2. 로컬에서 `docker compose config` 테스트
3. SSH 연결 테스트 (수동으로 먼저 확인)
4. 워크플로우 첫 실행 및 디버깅

**고려사항**:
- Nginx config를 Git에 커밋할지 말지 결정 필요
  - 현재: 서버에서 생성하는 방향으로 진행
  - 향후: Git에도 기록하도록 변경 가능
- 배포 실패 시 롤백 로직은 Phase 2로 미뤄도 됨
- 알림 기능은 선택 사항 (Slack webhook 등)

**블로커**:
- `nginx-conf-generator.md` Task가 완료되어야 함 (의존성)

---

> 다음 클로드 코드에게:
> - nginx-conf-generator가 먼저 완성되어야 이 워크플로우를 테스트할 수 있습니다
> - SSH 키 설정이 제대로 되었는지 먼저 수동으로 테스트해보세요
> - 워크플로우 파일을 작성한 후 작은 변경으로 트리거해보고 로그를 잘 확인하세요
> - 실패하더라도 로그를 devlog에 기록해서 다음 시도에 도움이 되도록 하세요
