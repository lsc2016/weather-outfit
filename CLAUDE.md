- 대화 시작하면 진행.md부터 읽어라.
- 무언가를 정하면 진행.md의 "정한 것"에 한 줄 보태라.
- 작업이 일단락되면 "지금 상태"와 "다음 할 일"을 고쳐라.

## 이 프로젝트
- "오늘 뭐 입지": 지금 체감온도(Open-Meteo 날씨)에 맞춰 옷차림을 추천하는 휴대폰용 웹앱.
- 빌드 없이 `index.html` 을 바로 연다. 내 옷장 · 입은 기록 · 입어 본 느낌은 모두 브라우저 localStorage 에 저장.
- GitHub Pages(`https://lsc2016.github.io/weather-outfit/`)로 열고, dashboard 의 `apps.json` 에 링크돼 있다.

## 폴더 지도
| 파일 | 하는 일 |
|---|---|
| `index.html` | 화면 틀. 탭 셋(오늘 #today · 옷장 #closet · 나 #me). 스크립트를 아래 순서로 불러옴 |
| `app.js` | 오늘 탭: 날씨 · 표(`OUTFIT_TABLE` · `WARMTH_TABLE` · `WEAR_NAME_HINTS`) · 입은 기록 · 느낌 묻기 · 탭 이동 |
| `coach.js` | 추천 계산(점수 · 색 규칙 · 코치 한마디 · 체감 보정 배우기). 화면 없음, 시험 대상 |
| `wardrobe.js` | 옷장 데이터(옷 한 벌 모양, `STORE` 저장, 백업 파일 읽기) |
| `closet.js` | 옷장 탭 화면(옷 추가 시트 · 내보내기/가져오기) |
| `me.js` | 나 탭(내 사이즈 · 옷장 분석 · 살 옷 메모) |
| `tag-reader.js` | "📷 택 찍기" — Tesseract.js(인터넷에서 받음)로 택 글자 읽기 |
| `character.js` | 종이 인형 캐릭터 SVG 그림 조각(`PIECES`) |
| `style.css` | 모양(색 토큰은 `:root`) |
| `make-icon.js` | 홈 화면 아이콘 PNG 만들기(`node make-icon.js`, sharp 필요) |
| `test/` | `npm test` 시험(추천 계산 · 카드 동작, node 내장만) |
| `manifest.json` | 홈 화면 앱 설정 |
| ⛔ `apple-touch-icon.png`, `icon-512.png` | 아이콘 그림(만든 결과물). 열지 말고, 바꿀 땐 `make-icon.js` 로 |
| `진행.md` | 지금 상태 · 정한 것 · 다음 할 일 (위 규칙대로) |

## 시작점
- 열기: `index.html` 을 브라우저로 (또는 `python3 -m http.server` 후 접속). 빌드 없음.
- 시험: `npm test` (= `node --test`).
- 처음 읽을 곳: `진행.md` → `app.js` 맨 위 표들 → `coach.js` 맨 위 숫자들(`SCORE` · `FEEDBACK` · `SWING`).

## 고치는 규칙
- 있는 것을 지우고 새로 만들지 말고, 더하고 보완하기.
- 사람이 승인하기 전에 데이터 파일·설정 파일을 지우거나 덮어쓰지 않기.
- 삭제 명령(rm -rf 등)은 쓰지 않기.
- 어느 화면에서든 첫 화면으로 돌아갈 길(로고 누르면 첫 화면)을 없애지 않기. (지금: 왼쪽 위 "오늘뭐입지" → #today, "← 뒤로", 창은 ✕ · Esc · 바깥 누르기)
- localStorage 키 이름(`outfit.*.v1`)과 저장 모양을 바꾸면 예전 기록을 읽는 길(normalize)을 꼭 남기기.

## 읽는 양 줄이기
| 이런 일이면 | 이 파일만 읽어라 |
|---|---|
| 추천 순서 · 점수 · 코치 한마디 | `coach.js` (+ `test/coach.test.js`) |
| 기본 룩 표 · 온도 구간 | `app.js` 앞부분(1~190줄) |
| 날씨 불러오기 | `app.js` 의 `fetchWeather` · `loadWeather` (`grep -n` 으로 찾기) |
| 입은 기록 · "다른 옷 입었어요" 시트 · 느낌 묻기 | `app.js` (`grep -n "WORN_KEY\|FEEDBACK_KEY\|buildWearRow"`) |
| 옷 추가 · 백업 | `closet.js`, `wardrobe.js` |
| 나 탭 | `me.js` |
| 택 찍기 | `tag-reader.js` |
| 캐릭터 그림 | `character.js` |
| 모양 | `style.css` (큼, 필요한 부분만 grep) |

열지 말 것: `*.png`(아이콘 그림). `진행.md` 의 "정한 것"은 길어서 필요한 날짜만 grep.

## 용어
| 우리말 | 코드 |
|---|---|
| 추천안 · 룩 | `looks`, `Coach` 결과의 `{ top, bottom, outer, acc, tip }` |
| 기본 룩 | `OUTFIT_TABLE` 의 looks |
| 따뜻한 정도(1~5) · 두께 | `warmth`, `THICKNESS` |
| 온도 구간 | `WARMTH_TABLE` / `OUTFIT_TABLE` 의 `min` |
| 코치 한마디 | `tip`, `COACH_RULES` · `COACH_ADDONS` |
| 입은 기록 · 도장 | `outfit.worn.v1`, `state.worn` |
| 입어 본 느낌 · 배운 보정 | `outfit.feedback.v1`, `FEEDBACK`, `learned` |
| 체감 보정 3단계 | `outfit.sensitivity` |
| 안에 입은 옷 | `inner`, `innerTop` · `innerBottom` |
| 일교차 | `feelsHi` · `feelsLo`, `SWING` |

## 다른 프로젝트와의 연결
- `/home/user/dashboard/apps.json` 이 이 앱을 GitHub Pages 주소로 링크(읽기만, 이 저장소는 그쪽을 안 씀).
- 바깥 서비스: Open-Meteo 날씨(키 없음), jsdelivr 의 Tesseract.js 5.1.1(택 찍기 때만).

## 저장소 밖
- 사용자 데이터는 전부 각 브라우저의 localStorage (옷장 · 사진 · 입은 기록 · 느낌 · 사이즈 · 메모). 백업은 "내보내기" JSON 파일.
- `make-icon.js` 가 쓰는 sharp: 저장소에 없음, `/usr/local/lib/node_modules` 등에서 찾음.

## 모르는 것 (확인 필요)
- GitHub Pages 배포 설정(어느 브랜치에서 내보내는지).
- 휴대폰에서 localStorage 용량(사진 많을 때) 실제 한계.
