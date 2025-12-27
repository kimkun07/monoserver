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

### 2025-12-27 (저녁) - 테스트 브랜치에서 GitHub Actions 테스트

**상태**: 🟢 진행중

**진행 내용**:
- `test-github-actions` 브랜치 생성
- `.github/workflows/deploy.yml` 수정:
  - test-github-actions 브랜치에서도 워크플로우 트리거되도록 설정
  - 배포 단계에 조건 추가: main 브랜치에서만 실제 GCE 배포 수행
  - 테스트 브랜치에서는 config 생성 및 자동 커밋만 테스트
- 안전한 테스트 환경 구축 완료

**다음 단계**:
1. 워크플로우 변경사항 커밋
2. test-github-actions 브랜치로 push
3. GitHub Actions 워크플로우 실행 확인
4. 로그 검토 및 에러 수정
5. 성공 시 main 브랜치로 PR 생성

**테스트 계획**:
- ✅ 브랜치 생성
- ✅ 워크플로우 파일 수정
- ⏳ Push 및 워크플로우 트리거
- ⏳ 로그 확인
- ⏳ 문제 해결

**고려사항**:
- test 브랜치에서는 배포 스킵되므로 안전
- GitHub Secrets/Variables가 설정되어 있어야 함
- nginx-config-generator의 의존성 설치가 제대로 되는지 확인 필요

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - 첫 GitHub Actions 실행 로그를 잘 확인하세요
> - 특히 npm install, npm run generate 부분 체크
> - 커밋 권한 문제가 있을 수 있으니 주의하세요
> - 성공하면 main으로 merge하고 실제 배포 테스트 진행

### 2025-12-27 (오후) - GitHub Actions 워크플로우 구현 완료

**상태**: 🟡 준비중 → 🟢 진행중

**진행 내용**:
- `.github/workflows/deploy.yml` 파일 생성 완료
- 3단계 워크플로우 구현:
  1. **Checkout & Setup**: 코드 체크아웃, Node.js 20 설정
  2. **Generate Configs**: nginx-config-generator 실행
  3. **Auto-commit**: 변경된 conf.d 파일 자동 커밋 (변경 있을 때만)
  4. **Deploy to GCE**: SSH로 서버 접속, git pull, docker compose up -d, nginx reload
- Trigger 조건: compose.yaml, nginx/**, .github/workflows/deploy.yml 변경 시
- GitHub Secrets 설정 필요 항목 문서화:
  - `GCE_HOST`: GCE 외부 IP
  - `GCE_USER`: SSH 사용자명
  - `GCE_SSH_KEY`: SSH private key
- GitHub Variables 설정 항목:
  - `GIT_BOT_NAME`: github-actions[bot]
  - `GIT_BOT_EMAIL`: github-actions[bot]@users.noreply.github.com
- appleboy/ssh-action@v1.0.3 사용 (안정성)

**주요 기능**:
1. **자동 Nginx 설정 생성**: compose.yaml 변경 시 자동으로 conf.d 파일 생성
2. **자동 커밋**: 생성된 파일을 Git에 자동으로 커밋 (변경 있을 때만)
3. **무중단 배포**: `docker compose up -d`는 변경된 서비스만 재시작
4. **무중단 Nginx 재로드**: `nginx -s reload`로 설정 변경 적용
5. **배포 검증**: nginx config test 및 container status 출력

**테스트 결과**:
- ⏸️ 실제 GitHub Actions 실행 대기중 (사용자가 수행 예정)

**다음 단계**:
1. 사용자가 GitHub Secrets 설정
2. compose.yaml 수정 후 커밋
3. GitHub Actions 로그 확인
4. 에러 발생 시 devlog에 기록 및 수정
5. 성공 시 Task 완료 처리

**고려사항**:
- **변경 감지**: git diff로 conf.d 변경 여부 확인 후 커밋
- **커밋 메시지**: Claude Code + Happy 크레딧 포함
- **에러 처리**: nginx config test 실패 시 워크플로우 중단
- **로그 가시성**: 배포 단계별 상태 출력

**블로커**: 없음 (사용자 테스트 대기)

**워크플로우 파일 위치**: `.github/workflows/deploy.yml`

---

> 다음 클로드 코드에게:
> - GitHub Actions 워크플로우 완성되었습니다
> - 사용자가 테스트하면서 에러를 발견할 예정
> - SSH 연결 실패, 권한 문제, nginx reload 실패 등을 주의하세요
> - 에러 로그를 잘 읽고 devlog에 기록하세요
> - appleboy/ssh-action 버전 업데이트 시 breaking change 확인하세요

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
