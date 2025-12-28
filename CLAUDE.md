# Claude Code 사용 가이드 - monoserver 프로젝트

## 개요

이 문서는 Claude Code가 monoserver 프로젝트에서 효과적으로 작업하기 위한 가이드입니다.

## 프로젝트 구조

monoserver 프로젝트는 **여러 개의 독립적인 Task로 구성**되어 있습니다.

### Task 기반 구조

각 Task는:
- **독립적인 목표**를 가지고 있음
- **독립적인 devlog 파일**로 추적됨 (`.claude/devlog/[task-name].md`)
- **독립적으로 완료** 가능
- **의존성**이 있을 수 있음 (main.md의 Task 의존성 참조)

### 현재 Task 목록

```
monoserver/
├── nginx-config-generator/    # Task: Nginx 설정 파일 자동 생성
├── scripts/                    # Task: 설치 및 유틸리티 스크립트
│   └── install-docker-rootless.sh
├── .github/workflows/          # Task: GitHub Actions 워크플로우
│   └── deploy.yml
├── nginx/                      # Nginx 설정 (자동 생성됨)
├── compose.yaml                # Docker Compose 설정
└── .claude/devlog/             # Task 진행 상황 추적
    ├── main.md                     # 전체 프로젝트 진행 상황
    ├── nginx-conf-generator.md     # Task: Nginx Config Generator
    ├── docker-rootless.md          # Task: Docker Rootless 설치
    ├── github-action.md            # Task: GitHub Actions
    ├── google-compute-engine.md    # Task: GCE 서버 설정
    └── install-guide.md            # Task: 설치 가이드 문서화
```

### Task 이름 규칙

- **디렉토리/파일 기반**: `nginx-config-generator`, `docker-rootless`
- **기능 기반**: `github-action`, `google-compute-engine`
- **문서 기반**: `install-guide`

## 커밋 메시지 형식

monoserver 프로젝트는 **Task 기반 커밋 메시지 형식**을 사용합니다.

### 형식

```
[task] 한글 설명
```

### 예시

```bash
[nginx-conf-generator] v2.5 nginx 서비스명 필수 검증 추가
[github-action] deploy.yml 에러 처리 강화
[docker-rootless] CAP_NET_BIND_SERVICE 설정 추가
[install] 설치 가이드 초안 작성
```

### 규칙

1. **Task 이름**: 대괄호 `[]` 안에 task 이름 작성 (영문, 소문자, 하이픈)
2. **설명**: 한글로 명확하게 작성
3. **간결함**: 한 줄로 요약 (상세 내용은 body에 작성)
4. **접두사 금지**: `fix:`, `feat:`, `chore:` 등의 conventional commits 접두사 사용하지 않음
   - ❌ `fix: [task] 버그 수정`
   - ✅ `[task] 버그 수정`

### 특수 케이스

- **여러 Task 동시 수정**: 각 Task를 별도 대괄호로 명시
  ```
  [github-action] [devlog] deploy.yml 에러 처리 수정 및 devlog 업데이트
  [nginx-conf-generator] [github-action] 설정 파일 생성 및 워크플로우 연동
  ```

- **프로젝트 전체 설정**: `[project]` 사용
  ```
  [project] .gitignore 업데이트
  [project] README 초안 작성
  ```

- **Claude 관련 설정**: `[claude]` 사용
  ```
  [claude] CLAUDE.md 구조 설명 추가
  [claude] devlog 시스템 개선
  ```

- **자동 생성 커밋**: 예외적으로 `chore:` 접두사 사용 (GitHub Actions 자동 커밋)
  ```
  chore: regenerate nginx configs
  ```

## devlog 시스템

monoserver 프로젝트는 **devlog 시스템**을 사용하여 개발 작업을 관리합니다.

### devlog 디렉토리 구조

```
.claude/
├── claude.md              # 이 문서 (Claude Code 가이드)
└── devlog/
    ├── main.md            # 프로젝트 전체 진행 상황 (시작점)
    ├── nginx-conf-generator.md
    ├── github-action.md
    ├── google-compute-engine.md
    └── install-guide.md
```

### 새로운 Task 시작 프로세스

사용자가 새로운 Task를 시작하고 싶을 때 (예: Docker rootless 설정, 새로운 기능 추가 등):

1. **새로운 devlog 파일 생성**
   - `.claude/devlog/` 디렉토리에 task 이름으로 파일 생성 (예: `docker-rootless.md`)
   - 템플릿 구조 사용:
     - 개요
     - 목표
     - TODO 리스트
     - 클로드 코드 일기 섹션

2. **main.md 업데이트**
   - Task 진행 상황 테이블에 새 항목 추가
   - 우선순위 설정 (P0, P1, P2 등)
   - 상태를 🟡 준비중 또는 🟢 진행중으로 설정
   - Task 의존성 다이어그램 업데이트 (필요시)

3. **작업 수행**
   - 새로 생성한 devlog 파일의 TODO를 따라 진행
   - 진행 상황을 devlog에 기록

4. **CLAUDE.md 업데이트 (필요시)**
   - 새로운 프로세스나 규칙이 발견되면 이 문서 업데이트
   - 다음 Claude Code가 동일한 프로세스를 따르도록 명시

### 기존 Task 작업 시작 프로세스

Claude Code가 monoserver 프로젝트에서 기존 Task를 작업할 때 다음 순서를 따릅니다:

1. **`.claude/devlog/main.md` 읽기**
   - 프로젝트 전체 개요 파악
   - 현재 진행 상황 확인
   - 다음에 해야 할 작업 확인
   - Task 우선순위 및 의존성 파악

2. **해당 Task 파일 읽기**
   - Task 설명 및 요구사항 이해
   - TODO 리스트 확인
   - 이전 Claude Code가 남긴 일기 읽기

3. **작업 수행**
   - TODO 리스트에 따라 작업 진행
   - 문제가 발생하면 해결 시도 및 기록
   - 테스트 및 검증

4. **devlog 업데이트**
   - TODO 리스트 체크
   - "클로드 코드 일기" 섹션에 작업 내용 기록:
     - 진행한 내용
     - 성공한 부분
     - 실패한 부분 및 원인
     - 다음 단계 제안
     - 다음 Claude Code를 위한 조언

5. **main.md 업데이트**
   - Task 상태 변경 (🟡 → 🟢 → ✅)
   - 최근 업데이트 섹션에 작업 내용 기록

### 상태 아이콘

- 🔴 **차단됨** (Blocked): 다른 작업이 완료되어야 진행 가능
- 🟡 **준비중** (Not Started): 아직 시작 안 함
- 🟢 **진행중** (In Progress): 현재 작업 중
- ✅ **완료** (Completed): 작업 완료
- ⏸️ **보류** (On Hold): 임시로 중단

### 클로드 코드 일기 작성 가이드

"클로드 코드 일기"는 가장 중요한 섹션입니다. 다음 Claude Code 세션이 이 내용을 읽고 어디서부터 시작해야 할지 알 수 있습니다.

**좋은 일기 예시**:
```markdown
### 2025-12-26 - Nginx Config Generator 구현

**상태**: 🟡 준비중 → 🟢 진행중

**진행 내용**:
- scripts/generate-nginx-configs.ts 파일 생성
- js-yaml 라이브러리로 compose.yaml 파싱 성공
- hello 서비스에 대한 .conf 파일 생성 테스트 성공

**다음 단계**:
1. 모든 서비스에 대해 반복 로직 작성
2. pnpm 스크립트에 추가

**고려사항**:
- 포트 번호는 수동으로 지정하는 게 더 명확함

**블로커**: 없음

**테스트 결과**:
- ✅ compose.yaml 파싱 성공
- ✅ hello.conf 생성 성공

---

> 다음 클로드 코드에게:
> - fs/promises를 사용해서 비동기로 파일 쓰기 하세요
> - 에러 처리를 철저히 하세요
```

**나쁜 일기 예시** (피해야 함):
```markdown
### 2025-12-26 - 작업함

**진행 내용**:
- 코드 작성

**다음 단계**:
- 테스트

> 다음 클로드 코드에게:
> - 열심히 하세요
```

## 작업 우선순위

1. **P0**: `nginx-conf-generator.md` - 최우선
2. **P0**: `github-action.md` - nginx-conf-generator 완성 후
3. **P0**: `google-compute-engine.md` - 실제 배포 환경 설정
4. **P1**: `install-guide.md` - 위 3개 완료 후 문서화

## 마무리 체크리스트

작업을 마치기 전에:
- [ ] TODO 리스트 업데이트
- [ ] "클로드 코드 일기" 작성 (구체적으로!)
- [ ] 테스트 결과 기록
- [ ] 다음 Claude Code를 위한 조언 작성
- [ ] main.md의 Task 상태 업데이트
- [ ] main.md의 "최근 업데이트" 섹션에 항목 추가
- [ ] **커밋 메시지 형식 확인**: `[task] 한글 설명` 형식 준수

---

**이 devlog 시스템을 사용하면 Claude Code 세션 간에 컨텍스트가 유지됩니다.**
