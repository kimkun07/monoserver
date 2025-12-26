# Task: Nginx Config Generator

## 개요

`compose.yaml` 파일의 서비스 정의를 읽어서 각 서비스에 대한 Nginx 리버스 프록시 설정 파일(`.conf`)을 자동으로 생성하는 TypeScript 스크립트를 작성합니다.

## 목표

- `compose.yaml` 파싱하여 서비스 목록 추출
- 각 서비스에 대해 `./nginx/conf.d/{service-name}.conf` 생성
- 서비스별 subdomain 기반 프록시 설정 생성
- `monoserver-nginx-main` 서비스는 제외 (프록시 자체이므로)

## 요구사항

### 입력
- **파일**: `compose.yaml` (프로젝트 루트)
- **형식**: Docker Compose v3+ YAML 형식
- **서비스 구조**:
  ```yaml
  services:
    service-name:
      image: ...
      x-monoserver-port: "포트번호"  # 웹브라우저에 포트 없이 접속했을 경우에만 연결할 포트 번호
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

## TODO
- [x] YAML 파서 라이브러리 설치 (`js-yaml` 또는 내장 사용)
- [x] `compose.yaml` 읽기 및 파싱
- [x] 서비스 목록 추출 (monoserver-nginx-main 제외)
- [x] 각 서비스에 대한 `.conf` 템플릿 생성
- [x] `./nginx/conf.d/` 디렉토리 초기화 (기존 파일 삭제)
- [x] 생성된 `.conf` 파일 저장
- [x] 문서화 (README.md 업데이트)

## 기술 스택

- **언어**: TypeScript
- **런타임**: Node.js / tsx

## 클로드 코드 일기

### 2025-12-26 - nginx-config-generator 프로젝트 완성

**상태**: 🟡 준비중 → 🟢 진행중 → ✅ 완료

**진행 내용**:
- `nginx-config-generator/` 독립 프로젝트 생성 (표준 TypeScript 구조)
- 프로젝트 구조:
  - `src/index.ts`: 메인 생성 스크립트
  - `package.json`: js-yaml, tsx, TypeScript 의존성
  - `tsconfig.json`: ES2022, ESNext 모듈 설정
  - `README.md`: 사용법 및 문서화
- js-yaml로 compose.yaml 파싱 구현
- monoserver-nginx-main 서비스 자동 제외
- x-monoserver-port 필드 기반 설정 생성
- nginx/conf.d/ 디렉토리 자동 정리 및 재생성
- hello 서비스로 테스트 완료 (포트 5678)

**테스트 결과**:
- ✅ compose.yaml 파싱 성공
- ✅ hello.conf 생성 성공
- ✅ 올바른 Nginx 설정 형식 확인
- ✅ npm run test 스크립트 동작 확인

**주요 기능**:
1. compose.yaml에서 services 읽기
2. x-monoserver-port 필드가 있는 서비스만 처리
3. {service-name}.localhost 서브도메인 자동 설정
4. http://{service-name}:{port}/ 프록시 패스 생성

**프로젝트 위치**:
- `nginx-config-generator/` (프로젝트 루트에 위치)

**사용 방법**:
```bash
cd nginx-config-generator
npm install
npm run generate  # 또는 npm run test
```

**다음 단계**: 없음 (기능 완성)

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - nginx-config-generator는 완성되었습니다
> - 새 서비스를 추가할 때는 compose.yaml에 x-monoserver-port 필드를 추가하세요
> - 생성기를 실행하려면 `cd nginx-config-generator && npm run generate`
> - 다음은 GitHub Action 설정으로 진행하면 됩니다

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

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - compose.yaml의 현재 구조를 먼저 확인하세요
> - 테스트는 로컬에서 `tsx` 실행해보세요
