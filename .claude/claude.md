# Claude Code 사용 가이드 - monoserver 프로젝트

## 개요

이 문서는 Claude Code가 monoserver 프로젝트에서 효과적으로 작업하기 위한 가이드입니다.

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

### 작업 시작 프로세스

Claude Code가 monoserver 프로젝트에서 작업을 시작할 때 다음 순서를 따릅니다:

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

---

**이 devlog 시스템을 사용하면 Claude Code 세션 간에 컨텍스트가 유지됩니다.**
