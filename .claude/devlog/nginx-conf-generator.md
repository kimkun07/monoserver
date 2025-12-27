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

### 2025-12-27 - v2.3: Docker DNS Resolver 및 동적 DNS 해석

**상태**: ✅ 완료 (v2.3)

**진행 내용**:
- **Docker DNS resolver 추가**: 생성된 모든 nginx config에 `resolver 127.0.0.11 valid=30s;` 추가
  - 127.0.0.11은 Docker의 내부 DNS 서버 주소
  - 컨테이너 호스트명을 동적으로 해석할 수 있도록 설정
- **동적 DNS 해석 구현**: proxy_pass에 변수 사용
  - `set $upstream_{servicename} {servicename};` 변수 선언
  - `proxy_pass http://$upstream_{servicename}:{port}/;` 형식으로 변경
  - 변수 이름은 하이픈을 언더스코어로 변환 (nginx 변수명 규칙)
- **시작 순서 문제 해결**:
  - 이전: nginx 시작 시 upstream DNS 해석 실패하면 시작 실패
  - 현재: 요청 시점에 DNS 해석하므로 시작 순서 무관
- **테스트 케이스 업데이트**: 모든 expected 파일에 resolver 및 변수 추가
  - test/02-no-listen-ports/expected/hello.conf
  - test/03-with-listen-ports/expected/{admin,hello}.conf
  - test/04-no-default-port/expected/hello.conf
  - test/05-with-default-port/expected/hello.conf
  - test/06-rename-main-service/expected/hello.conf

**문제 해결**:
- **원인**: nginx가 시작할 때 upstream 호스트를 즉시 해석하려 시도
  - hello 컨테이너가 아직 DNS에 등록되지 않으면 "host not found" 에러
  - nginx 컨테이너가 시작 실패로 종료
- **해결책**:
  1. Docker DNS resolver 설정으로 동적 DNS 조회 활성화
  2. proxy_pass에 변수 사용으로 시작 시점이 아닌 요청 시점에 DNS 해석
  3. compose.yaml에 depends_on 추가 (시작 순서 보장)

**테스트 결과**:
- ✅ 6/6 테스트 케이스 통과
- ✅ docker compose down && up 테스트 성공 (시작 순서 무관하게 동작)
- ✅ nginx "host not found" 에러 해결
- ✅ 포트 80 프록시 정상 작동

**코드 변경**:
- `src/index.ts:176-211`: generateNginxConfig() 함수 템플릿 수정
  - resolver 디렉티브 추가
  - 변수 기반 proxy_pass 구현
  - 주석으로 동작 원리 설명

**다음 단계**: GitHub Action 설정 (변경 없음)

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - **v2.3 완성**: Docker DNS resolver 및 동적 DNS 해석 추가
> - **모든 서비스에 자동 적용**: 새로운 서비스를 추가해도 DNS 문제 없음
> - **컨테이너 시작 순서 무관**: depends_on과 동적 DNS로 안정적 시작 보장
> - **테스트 검증 완료**: 모든 테스트 케이스가 새 템플릿으로 업데이트됨

### 2025-12-26 - v2.2: 데이터 기반 테스트 구조 개편

**상태**: ✅ 완료 (v2.2)

**진행 내용**:
- **테스트 구조 완전 개편**: 코드 기반 → 데이터 기반 테스트로 전환
- **새로운 테스트 디렉토리**: `test/` 구조로 6개 테스트 케이스 재구성
  1. `01-missing-params`: 필수 파라미터 누락 시 실패
  2. `02-no-listen-ports`: listen ports 기본값 [80] 테스트
  3. `03-with-listen-ports`: 여러 listen ports 테스트
  4. `04-no-default-port`: $server_port 동적 라우팅
  5. `05-with-default-port`: 고정 포트 사용
  6. `06-rename-main-service`: 커스텀 nginx 서비스명 스킵
- **test.json 메타데이터**: 각 테스트 케이스의 설정을 JSON으로 정의
  - `shouldFail`: 에러 예상 여부를 데이터로 판별
  - `expectedError`: 예상 에러 메시지 검증
  - `params`: CLI 파라미터 명시
- **test-runner.ts 재작성**: 자동으로 테스트 케이스 디렉토리 순회 및 검증
- **자동 cleanup**: 각 테스트 실행 전 기존 output 파일 자동 삭제
- **npm run test:clean**: 모든 테스트 output 수동 삭제 스크립트 (`test/*/nginx/conf.d`)
- **파일 정리**: 기존 개별 test-*.ts 파일 삭제, test-utils.ts 삭제
- **깔끔한 디렉토리 구조**: 기존 복잡한 구조를 `test/`로 단순화

**테스트 결과** (6개 테스트 케이스):
- ✅ 모든 테스트 통과
- ✅ 에러 케이스도 데이터 기반으로 검증

**주요 개선사항**:
1. **데이터 기반 테스트**: 새 테스트 추가 시 코드 수정 불필요
2. **명확한 구조**: 각 테스트 케이스가 독립적인 디렉토리
3. **메타데이터 분리**: test.json으로 테스트 설정 명시
4. **자동 발견**: test-runner가 test/ 디렉토리를 자동 순회
5. **확장 용이**: 새 케이스는 디렉토리만 추가하면 됨
6. **자동 cleanup**: 각 테스트 전 기존 output 삭제로 깨끗한 상태 보장
7. **output 보존**: 테스트 후 생성 파일 유지로 수동 검증 가능

**프로젝트 구조**:
```
nginx-config-generator/
├── src/
│   ├── index.ts
│   └── test-runner.ts
├── test/
│   ├── 01-missing-params/
│   ├── 02-no-listen-ports/
│   ├── 03-with-listen-ports/
│   ├── 04-no-default-port/
│   ├── 05-with-default-port/
│   └── 06-rename-main-service/
```

**테스트 실행**:
```bash
npm test              # 전체 테스트 자동 실행
npm run test:clean    # 테스트 output 파일 전부 삭제 (test/*/nginx/conf.d)
```

**다음 단계**: ✅ 완료 → GitHub Action 설정으로 진행

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - **v2.2 완성**: 데이터 기반 테스트 구조로 완전 개편
> - **테스트 추가 방법**: `test/` 에 새 디렉토리 생성, test.json + compose.yaml + expected/ 구성
> - **shouldFail 활용**: 에러 케이스는 test.json에서 shouldFail: true로 설정
> - **자동 발견**: test-runner가 알아서 모든 케이스 실행
> - 다음은 GitHub Action 설정으로 진행하면 됩니다

### 2025-12-26 - v2.1: 필수 파라미터 및 강화된 테스트 스위트

**상태**: ✅ 완료 (v2.1)

**진행 내용**:
- **필수 파라미터 강제**: 모든 CLI 파라미터 기본값 제거, 명시적 제공 필수
- **TypeScript 오류 수정**: parseArgs 반환 타입 non-null assertion 추가
- **강화된 테스트 스위트**: 4개의 독립적인 테스트 스위트로 분리
  1. CLI 파라미터 검증 (test-cli-params.ts)
  2. Listen ports 배열 테스트 (test-listen-ports.ts)
  3. Default port 테스트 (test-default-port.ts)
  4. 커스텀 nginx 서비스명 테스트 (test-nginx-service-name.ts)
- **테스트 유틸리티**: 공통 테스트 함수 분리 (test-utils.ts)
- **통합 test runner**: 모든 테스트를 순차 실행하고 결과 요약

**테스트 결과** (12개 테스트 케이스):
- ✅ CLI 파라미터 누락 시 실패 (4개 케이스)
- ✅ Listen ports 기본값 [80] 테스트
- ✅ Listen ports 배열 [80, 8080, 9000] 테스트
- ✅ Default port 없을 때 $server_port 사용
- ✅ Default port 있을 때 고정 포트 사용
- ✅ 커스텀 nginx 서비스명 스킵 테스트 (my-custom-nginx-proxy)
- ✅ 정확히 2개 파일 생성 검증

**주요 개선사항**:
1. **명시적 파라미터**: 기본값 제거로 실수 방지
2. **포괄적 테스트**: 모든 기능 시나리오 커버
3. **독립적 테스트**: 각 테스트 스위트 개별 실행 가능
4. **상세한 오류 보고**: diff 형식으로 예상/실제 비교

**테스트 실행**:
```bash
npm test  # 전체 테스트 스위트
tsx src/test-cli-params.ts  # 개별 테스트
```

**다음 단계**: 문서 완성 후 GitHub Action 설정

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - **v2.1 완성**: 필수 파라미터, 강화된 테스트 (12개 케이스)
> - **테스트 스위트**: 4개 독립 테스트, test-utils.ts 공유
> - **파라미터 없이 실행 불가**: 모든 파라미터 명시 필수
> - **개별 테스트 실행**: `tsx src/test-*.ts`로 각 스위트 실행 가능
> - 다음은 GitHub Action 설정

### 2025-12-26 - v2.0: 고급 기능 추가 및 테스트 스위트 구현

**상태**: ✅ 완료 (v2.0)

**진행 내용**:
- **CLI 파라미터 추가**: `--compose-path`, `--output-dir`, `--nginx-service`
- **경로 검증 강화**: compose.yaml, nginx/, nginx.conf 존재 확인 (안전한 삭제 보장)
- **자동 생성 주석**: 모든 .conf 파일에 자동 생성 경고 헤더 추가
- **x-monoserver-default-port**: 기존 x-monoserver-port에서 이름 변경, 선택적 필드로 변경
- **x-monoserver-listen-ports**: 배열로 여러 listen 포트 지정 가능
- **동적 프록시 라우팅**: default-port 없으면 `$server_port` 사용
- **완전한 테스트 스위트**: test/compose.yaml과 expected/ 디렉토리로 자동 검증

**테스트 결과**:
- ✅ 4가지 시나리오 테스트 통과
  - Full config (default port + listen ports)
  - Default port only
  - Listen ports only (dynamic routing)
  - Minimal config (all defaults)
- ✅ 경로 검증 테스트 통과
- ✅ CLI 파라미터 테스트 통과

**주요 기능 (v2.0)**:
1. **유연한 포트 설정**:
   - `x-monoserver-default-port`: 백엔드 프록시 포트 (선택적)
   - `x-monoserver-listen-ports`: Nginx listen 포트 배열 (기본값: [80])
2. **동적 라우팅**: default port 없으면 클라이언트 접속 포트로 프록시
3. **안전한 삭제**: 경로 검증으로 잘못된 디렉토리 삭제 방지
4. **파라미터화**: 모든 경로와 서비스명 커스터마이즈 가능
5. **자동 검증**: npm test로 생성 결과 자동 비교

**프로젝트 구조**:
```
nginx-config-generator/
├── src/
│   ├── index.ts         # 메인 생성기 (CLI 파라미터, 경로 검증)
│   └── test-runner.ts   # 테스트 실행기
├── test/
│   ├── compose.yaml     # 테스트 입력
│   ├── nginx/nginx.conf # 검증용
│   └── expected/        # 예상 결과 (4개 파일)
├── package.json
├── tsconfig.json
└── README.md
```

**사용 방법**:
```bash
# 기본 사용
cd nginx-config-generator
npm install
npm run generate

# CLI 파라미터 사용
tsx src/index.ts \
  --compose-path /path/to/compose.yaml \
  --output-dir /path/to/output \
  --nginx-service my-nginx

# 테스트 실행
npm test
```

**compose.yaml 예시**:
```yaml
services:
  my-service:
    image: my-app
    x-monoserver-default-port: "3000"       # 선택적
    x-monoserver-listen-ports: [80, 8080]  # 선택적
```

**다음 단계**: GitHub Action 설정

**블로커**: 없음

---

> 다음 클로드 코드에게:
> - **v2.0 완성**: CLI 파라미터, 경로 검증, 동적 라우팅, 테스트 스위트 모두 완료
> - **필드 변경**: `x-monoserver-port` → `x-monoserver-default-port` (선택적)
> - **신규 필드**: `x-monoserver-listen-ports` (배열, 기본값 [80])
> - **동적 라우팅**: default-port 없으면 `http://service:$server_port/` 사용
> - **테스트**: `npm test`로 4가지 시나리오 자동 검증
> - **CLI**: `--compose-path`, `--output-dir`, `--nginx-service` 옵션 사용 가능
> - 다음은 GitHub Action 설정으로 진행하면 됩니다

### 2025-12-26 - v1.0: 초기 구현 완료

**상태**: 🟡 준비중 → 🟢 진행중 → ✅ 완료 (v1.0)

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
npm run generate
```

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
