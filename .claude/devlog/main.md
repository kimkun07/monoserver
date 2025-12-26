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
| GitHub Actions 워크플로우 | 🟡 준비중 | P0 | `github-action.md` |
| Google Compute Engine 설정 | 🟡 준비중 | P0 | `google-compute-engine.md` |
| 설치 가이드 및 스크립트 | 🟡 준비중 | P1 | `install-guide.md` |

### 상태 범례
- 🔴 차단됨 (Blocked)
- 🟡 준비중 (Not Started)
- 🟢 진행중 (In Progress)
- ✅ 완료 (Completed)
- ⏸️ 보류 (On Hold)

## Task 의존성

```
nginx-conf-generator.md (P0)
    ↓
github-action.md (P0)
    ↓
google-compute-engine.md (P0)
    ↓
install-guide.md (P1)
```

**권장 작업 순서:**
1. `nginx-conf-generator.md` - Nginx 설정 파일 생성 로직이 먼저 완성되어야 함
2. `github-action.md` - Generator를 GitHub Actions에서 실행
3. `google-compute-engine.md` - 서버 설정 및 배포 테스트
4. `install-guide.md` - 전체 프로세스가 검증된 후 문서화

## 다음 작업

클로드 코드가 수행해야 할 다음 작업:
1. **`github-action.md` 읽기** - GitHub Actions 워크플로우 설정
2. compose.yaml 변경 시 자동으로 nginx-conf-generator 실행
3. GCE 서버에 자동 배포되도록 워크플로우 작성

## 최근 업데이트

### 2025-12-26
- ✅ README.md 초안 작성 완료
- ✅ compose.yaml 기본 구조 설정
- ✅ devlog 시스템 구축
- ✅ nginx-conf-generator 완료 (v2.2): 데이터 기반 테스트, 자동 cleanup, 완전한 문서화
- 🟢 다음: GitHub Actions 워크플로우 설정

## 참고 자료

- 프로젝트 가이드: `/CLAUDE.md`
- 현재 compose.yaml: `/compose.yaml`
- Nginx 설정: `/nginx/nginx.conf`, `/nginx/conf.d/`

## 메모

- Docker는 rootless 모드로 설치 예정
- nginx/conf.d 아래는 자동 생성되므로 수동 편집 금지
- GitHub Actions는 `compose.yaml` 변경 시에만 트리거
