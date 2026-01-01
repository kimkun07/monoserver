# Caddy Migration - Nginx에서 Caddy로 마이그레이션

## 개요

monoserver 프로젝트를 Nginx 기반 reverse proxy에서 Caddy 기반으로 마이그레이션합니다.

## 목표

- ✅ Nginx에서 Caddy로 reverse proxy 전환
- ✅ Path-based routing에서 Subdomain-based routing으로 전환
- ✅ HTTPS 자동 설정 준비 (Caddy의 자동 Let's Encrypt 기능 활용)
- ✅ 모든 테스트 통과
- ✅ GitHub Actions 워크플로우 업데이트

## TODO 리스트

- [x] 새 브랜치 생성 (nginx-to-caddy)
- [x] nginx-config-generator를 caddyfile-generator로 리네임
- [x] caddyfile-generator 코드 수정
  - [x] x-monoserver-port → x-caddy-port
  - [x] Subdomain-based routing 구현
  - [x] 기본 localhost 응답 ("Hello, Caddy!")
- [x] 테스트 케이스들 재작성 및 검증
  - [x] 01-missing-params
  - [x] 02-no-listen-ports
  - [x] 04-skip-services-without-port
  - [x] 05-with-port
  - [x] 06-wrong-nginx-service (삭제)
  - [x] 07-mixed-services
- [x] compose.yaml에서 x-monoserver-port를 x-caddy-port로 변경
- [x] deploy.yml을 caddy 워크플로우로 변경
- [x] nginx 폴더 및 파일 삭제
- [x] Caddyfile 생성 테스트
- [x] 모든 테스트 통과 확인 (5/5 tests passed)
- [x] devlog 작성

## 클로드 코드 일기

### 2026-01-01 - Nginx to Caddy 마이그레이션 완료

**상태**: 🟡 준비중 → ✅ 완료

**진행 내용**:

1. **nginx-config-generator → caddyfile-generator 전환**
   - 디렉토리 리네임: `git mv nginx-config-generator caddyfile-generator`
   - package.json 업데이트
     - name: "caddyfile-generator"
     - description, keywords 수정
     - generate 스크립트: `--output-dir ..` (루트 디렉토리에 Caddyfile 생성)
     - test:clean 스크립트: Caddyfile 대상으로 수정

2. **index.ts 완전 재작성**
   - `x-monoserver-port` → `x-caddy-port`로 변경
   - Nginx 서비스명 검증 제거 (NGINX_SERVICE_NAME 상수 삭제)
   - validatePaths 간소화 (nginx 디렉토리 검증 제거)
   - **Path-based routing → Subdomain-based routing**
     - 이전: `/hello/` → `http://hello:5678/`
     - 이후: `hello.localhost` → `http://hello:5678`
   - generateLocationBlock → generateServerBlock으로 변경
   - generateRoutesConfig → generateCaddyfileContent로 변경
   - 기본 localhost 응답 추가: `respond "Hello, Caddy!"`

3. **Caddyfile 형식**
   ```
   # Header comment

   localhost {
       respond "Hello, Caddy!"
   }

   hello.localhost {
       reverse_proxy hello:5678
   }

   whoami.localhost {
       reverse_proxy whoami:80
   }
   ```

4. **test-runner.ts 수정**
   - routes.conf → Caddyfile로 변경
   - nginx → Caddyfile 경로 수정
   - "nginx-config-generator Test Suite" → "caddyfile-generator Test Suite"

5. **테스트 케이스 재작성**
   - 모든 compose.yaml에서 monoserver-nginx-main 서비스 제거
   - x-monoserver-port → x-caddy-port
   - outputDir: ./nginx → . (현재 디렉토리)
   - expected/routes.conf → expected/Caddyfile
   - 06-wrong-nginx-service 테스트 삭제 (더 이상 의미 없음)
   - **테스트 결과**: 5/5 tests passed ✅

6. **compose.yaml 업데이트**
   - hello, whoami 서비스: x-monoserver-port → x-caddy-port

7. **deploy.yml 완전 재작성**
   - nginx-config-generator → caddyfile-generator
   - nginx/routes.conf → Caddyfile
   - monoserver-nginx-main → caddy
   - `nginx -s reload` → `docker compose exec -w /etc/caddy caddy caddy reload`
   - `nginx -t` → `docker compose exec -w /etc/caddy caddy caddy validate`
   - paths 트리거: nginx/** → Caddyfile

8. **nginx 폴더 삭제**
   - `git rm -rf nginx/`
   - nginx.conf, routes.conf 제거

**주요 변경사항**:

- **Routing 방식 변경**: Path-based → Subdomain-based
  - 이전: `http://YOUR_IP/hello/` → `/hello/api`
  - 이후: `http://hello.localhost` → `/api`
  - DNS 설정 불필요 (localhost 기반 개발 환경)
  - 프로덕션에서는 실제 도메인으로 교체 가능

- **설정 파일 구조 단순화**:
  - 이전: nginx.conf (수동) + routes.conf (자동 생성)
  - 이후: Caddyfile (자동 생성, 단일 파일)

- **서비스명 강제 제거**:
  - 이전: monoserver-nginx-main 서비스명 필수
  - 이후: caddy 서비스명 자유롭게 설정 가능 (x-caddy-port로만 판단)

**테스트 결과**:
- ✅ caddyfile-generator 테스트: 5/5 통과
- ✅ Caddyfile 생성 성공 (hello.localhost, whoami.localhost)
- ✅ deploy.yml 문법 검증 완료

**블로커**: 없음

**다음 단계**:
1. PR 생성 및 main 브랜치로 merge
2. 실제 서버에서 테스트 (GCE)
3. 도메인 연결 시 Caddyfile 업데이트 (localhost → 실제 도메인)
4. HTTPS 자동 설정 검증 (Let's Encrypt)

**고려사항**:
- Caddy는 자동으로 HTTPS를 설정하므로, 프로덕션에서 도메인만 연결하면 바로 HTTPS 작동
- Subdomain routing은 개발 환경에서 `.localhost` 사용, 프로덕션에서는 실제 서브도메인 사용
- Caddyfile은 매우 간결하고 가독성이 높음

**Breaking Changes**:
- Path-based routing (`/hello/`) → Subdomain-based routing (`hello.localhost`)
- 기존 URL 구조가 완전히 변경됨
- nginx 폴더 및 설정 파일 완전 제거

---

> 다음 클로드 코드에게:
> - 브랜치를 main에 merge하고 실제 서버에서 테스트해보세요
> - Caddy는 자동으로 HTTPS를 설정하므로, 도메인만 연결하면 됩니다
> - Caddyfile 형식을 유지하세요 (탭 인덴트 사용)
> - README.md도 업데이트가 필요합니다 (path-based → subdomain-based)
