# Task: Nginx Config Generator

## 개요

`compose.yaml` 파일의 서비스 정의를 읽어서 각 서비스에 대한 Nginx 리버스 프록시 설정 파일(`.conf`)을 자동으로 생성하는 TypeScript 스크립트를 작성합니다.

## 목표

- `compose.yaml` 파싱하여 서비스 목록 추출
- 각 서비스에 대해 `./nginx/conf.d/{service-name}.conf` 생성
- 서비스별 subdomain 기반 프록시 설정 생성
- `nginx-main` 서비스는 제외 (프록시 자체이므로)

## 요구사항

### 입력
- **파일**: `compose.yaml` (프로젝트 루트)
- **형식**: Docker Compose v3+ YAML 형식
- **서비스 구조**:
  ```yaml
  services:
    service-name:
      image: ...
      labels:
        - "service-title=..."
  ```

### 출력
- **디렉토리**: `./nginx/conf.d/`
- **파일명**: `{service-name}.conf`
- **형식**:
  ```nginx
  server {
    listen       80;
    server_name  {service-name}.localhost;

    location / {
      proxy_pass http://{service-name}:{port}/;
    }
  }
  ```

### 스크립트 위치
- `scripts/generate-nginx-configs.ts` (새로 생성)
- 또는 `apps/manager/src/generate_nginx_configs.ts`

## TODO

### Phase 1: 기본 구현
- [ ] YAML 파서 라이브러리 설치 (`js-yaml` 또는 내장 사용)
- [ ] `compose.yaml` 읽기 및 파싱
- [ ] 서비스 목록 추출 (nginx-main 제외)
- [ ] 각 서비스에 대한 `.conf` 템플릿 생성
- [ ] `./nginx/conf.d/` 디렉토리 초기화 (기존 파일 삭제)
- [ ] 생성된 `.conf` 파일 저장

### Phase 2: 고급 기능
- [ ] 서비스 포트 자동 감지 (compose.yaml의 ports 또는 기본 포트)
- [ ] 커스텀 nginx 설정 지원 (labels를 통한 추가 설정)
- [ ] 에러 처리 및 유효성 검증
- [ ] 로깅 추가 (생성된 파일 목록 출력)

### Phase 3: 통합
- [ ] `pnpm` 스크립트에 추가 (`pnpm generate:nginx`)
- [ ] GitHub Actions 워크플로우에 통합
- [ ] 문서화 (README.md 업데이트)

## 기술 스택

- **언어**: TypeScript
- **런타임**: Node.js / tsx
- **라이브러리**:
  - `js-yaml` - YAML 파싱
  - `fs/promises` - 파일 시스템 작업
  - `path` - 경로 처리

## 설계 노트

### 포트 매핑 전략

Docker Compose에서는 컨테이너 간 통신 시 서비스 이름으로 접근 가능:
- `proxy_pass http://hello:5678/` ✅ (내부 네트워크)
- `proxy_pass http://172.17.0.1:8000/` ❌ (호스트 포트, 불필요)

**결정**: Compose 서비스 이름 사용 (더 간단하고 안정적)

### 포트 감지 로직

1. `compose.yaml`에서 `command`에 포트 정보가 있는 경우 파싱
2. 이미지 기본 포트 사용 (예: nginx → 80)
3. Labels에 `nginx.port` 같은 메타데이터 추가 가능

**초기 구현**: 수동으로 각 서비스에 포트 명시 (가장 명확함)

### 서비스 제외 규칙

- `nginx-main`: Nginx 자체이므로 프록시 설정 불필요
- 향후: `labels`에 `nginx.skip=true` 같은 마커로 제어 가능

## 참고 코드

기존 `apps/manager/src/update_conf_files.ts` 참고:
```typescript
// 기존 구현은 services/*.yaml을 읽지만
// 새 구현은 compose.yaml을 직접 읽음
```

## 클로드 코드 일기

### 2025-12-26 - 초기 계획 수립

**상태**: 🟡 준비중 → 🟢 진행중

**진행 내용**:
- devlog 시스템 설계 및 문서 작성
- 요구사항 정리 완료
- compose.yaml 구조 확인

**다음 단계**:
1. TypeScript 스크립트 뼈대 작성
2. YAML 파싱 테스트
3. 템플릿 생성 로직 구현
4. 로컬 테스트

**고려사항**:
- 기존 `apps/manager`의 코드를 재사용할지, 새로 작성할지 결정 필요
- 포트 감지를 어떻게 할지 (하드코딩 vs 자동감지)
- GitHub Actions에서 실행될 때 권한 문제 없는지 확인 필요

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - compose.yaml의 현재 구조를 먼저 확인하세요
> - 기존 Manager CLI 코드를 참고하되, 더 간단하게 만드세요
> - 테스트는 로컬에서 `tsx` 또는 `pnpm`으로 실행해보세요
