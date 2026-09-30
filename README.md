# 📸 바로고쳐 (BaroGochyeo)
> **Take a photo. Start the solution.**  
> 사진 한 장으로 시작되는 스마트 도시 안전 해결 솔루션 (AR Civic Reporting & Motion System)

[![GitHub Pages](https://img.shields.io/badge/Demo-GitHub%20Pages-brightgreen?logo=github)](https://kaiidesu.github.io/BaroGochyeo/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue?logo=pwa)](manifest.webmanifest)
[![License](https://img.shields.io/badge/License-MIT-orange)]()

![BaroGochyeo Poster Overview](docs/poster-overview.png)

---

## 🌐 Live Web Demo
체험 링크: **[https://kaiidesu.github.io/BaroGochyeo/](https://kaiidesu.github.io/BaroGochyeo/)**  
*(GitHub 저장소의 `Settings` → `Pages`에서 `main` 브랜치 배포 활성화 시 즉시 동작합니다.)*

---

## 📖 프로젝트 소개 (About Project)

**바로고쳐(BaroGochyeo)**는 도로 파손, 포트홀, 파손된 시설물 등 도시 위험 요소를 시민이 스마트폰 카메라로 비추기만 하면 실시간 AR로 자동 감지·측정하고, AI가 민원 공문서를 자동 작성하여 즉각 접수할 수 있도록 돕는 **시민 참여형 스마트 시티 웹 애플리케이션**입니다.

게이미피케이션(포인트 리워드, 주간 3D 포디움 리더보드, 동별 경쟁)과 웹 오디오/모션 피드백을 결합하여 시민들의 자발적 참여를 극대화합니다.

![How It Works Workflow](docs/poster-workflow.png)

---

## 🌟 주요 기능 (Key Features)

### 1. 🎯 실시간 AR 카메라 HUD (Live AR Detection HUD)
- **상단 모드 스위치**: `[ AR | Photo ]` 실시간 토글
- **위험물 스마트 타겟팅 박스**:
  - `Pothole detected` / `Risk: High` / `Approx. size: 40 cm` / `8 m ahead`
- **치수 가이드라인**: 도로 위 증강현실 측정 눈금 (`|← 40 cm →|`)
- **카메라 보조 도구**: 플래시라이트(Torch), 재스캔(Re-scan), 갤러리 업로드
- **원클릭 접수 버튼**: `✈️ Report Issue` 즉시 다음 단계 연결

![Street AR Mockup](docs/poster-street-ar.png)

### 2. 📋 AI 확인 및 검토 화면 (Confirm & Review)
- **3단계 프로그레스 바**: `1. Detect` → `2. Review` → `3. Submit`
- **현장 사진 교체 기능**: `📷 Change Photo`
- **AI 생성 민원문**: 자동 생성된 행정 양식 문구 및 원클릭 복사 (`📋 Copy`)
- **위험도 및 관할 배정**: High / Medium / Low 변경 및 담당 부서(양천구 도로관리과) 자동 배정 안내
- **안전신문고 연동**: 정부 '안전신문고(Safety e-Report)' 바로가기 지원

### 3. 🎉 축하 및 보상 모먼트 (Celebration & Points)
- **색종이 폭죽 애니메이션**: 캔버스 파티클 기반의 화려한 Confetti 폭죽 효과
- **+30 포인트 획득 팝업**: 접수 보상(+10), AI 검증(+15), 상세 정보 입력(+5) 상세 내역 표시
- **주간 목표 게이지**: 신월1동 / 양천구 주간 목표 달성률 실시간 반영
- **웹 오디오 & 햅틱 반응**: Web Audio API 기반 신디사이저 사운드(셔터음, 탭 효과음, 축하 팡파레) 및 기기 진동 지원

### 4. 🏆 듀얼 탭 주간 리더보드 (Weekly Leaderboard & 3D Podium)
- **동별 랭킹 (Neighborhoods)**: 신월1동(+30 기여), 양천구, 목동 등
- **시민 랭킹 (People)**: 시민 리포터 순위표 및 내 랭킹 하이라이트
- **3D 포디움 단상**: 1위(Gold), 2위(Silver), 3위(Bronze) 3D 입체 단상 & 골드 스윕 시머 효과
- **주간 리셋 카운트다운 타이머**: `Resets in 2d 14h`
- **임팩트 축하 배너**: *"Your report moved Sinwol-dong to #1!"*

### 5. 🛠️ 별도 모듈 및 PWA 지원
- **AR 거리/치수 측정기 (`ar-measure.html`)**: WebXR 및 인터랙티브 탭 기반 2점 거리 실측 도구
- **PWA 웹 앱 매니페스트 (`manifest.webmanifest`)**: 홈 화면 추가 및 네이티브 앱과 동일한 전체화면 경험 제공

---

## 🎨 캐릭터 마스코트 (BARO - Mascot)

친근한 도시 안전 지킴이 마스코트 **'바로(BARO)'**의 표정 및 포즈 시트:

| 표정 시트 (Expression Sheet) | 포즈 시트 (Poses Sheet) |
|:---:|:---:|
| ![Mascot Expressions](docs/mascot-expressions.png) | ![Mascot Poses](docs/mascot-poses.png) |

---

## 📁 프로젝트 파일 구조 (Project Structure)

```text
BaroGochyeo/
├── index.html              # 메인 웹 애플리케이션 (AR HUD, 리더보드, 리포트)
├── ar-measure.html         # WebXR / 인터랙티브 AR 치수 측정 독립 페이지
├── motion.css              # 모션 디자인 시스템 및 반응형 스타일시트
├── motion.js               # AR HUD 제어, 사운드, 3D 포디움, 인터랙션 로직
├── game-juice.js           # 색종이 폭죽, 포인트 애니메이션, 햅틱 피드백
├── manifest.webmanifest    # PWA 설정 매니페스트
├── icons/                  # PWA 앱 아이콘 (192x192, 512x512)
│   ├── icon-192.png
│   └── icon-512.png
├── docs/                   # 프레젠테이션 포스터 및 시각 디자인 자료
│   ├── poster-overview.png
│   ├── poster-workflow.png
│   ├── poster-street-ar.png
│   ├── mascot-expressions.png
│   └── mascot-poses.png
├── reports/                # 개선 전/후 UI 비교 스크린샷
│   └── screenshots/
├── .gitignore              # 시스템 및 캐시 파일 제외 설정
└── README.md               # 프로젝트 안내 문서
```

---

## 🚀 실행 방법 (Getting Started)

### 1. 로컬에서 실행 (Local Preview)
별도의 빌드 과정(Node.js/npm) 없이 브라우저에서 바로 열 수 있는 순수 웹 표준(Vanilla Web) 파일입니다.

- **방법 A**: `index.html` 파일을 더블 클릭하여 웹 브라우저에서 엽니다.
- **방법 B (카메라/AR 권한 테스트 권장 - 로컬 서버)**:
  ```bash
  # Python이 설치되어 있는 경우:
  python -m http.server 8000
  # 또는 npx serve:
  npx serve .
  ```
  브라우저에서 `http://localhost:8000` 접속

### 2. GitHub Pages 배포 방법 (Web Hosting)
1. GitHub 저장소(`https://github.com/KAIIIdesu/BaroGochyeo`) 접속
2. 상단 메뉴 **Settings** 클릭
3. 좌측 사이드바 **Pages** 클릭
4. **Build and deployment** > **Branch**에서 `main` 브랜치 선택 및 `/(root)` 선택 후 **Save** 클릭
5. 약 1분 후 생성되는 배포 주소(`https://kaiidesu.github.io/BaroGochyeo/`)로 누구나 바로 접속 가능합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Modern CSS3 (CSS Variables, Flexbox, Grid, 3D Transforms)
- **Web Audio API**: 브라우저 내장 오디오 합성 엔진 (무거운 mp3 파일 다운로드 없이 실시간 사운드 재생)
- **Animation & FX**: HTML5 Canvas Particle Engine (Confetti), Haptic Vibration API
- **AR & Sensors**: WebXR API / Camera MediaStream API (Live Video Feed)
- **PWA**: Web App Manifest, Standalone Display Mode, Responsive Viewport Optimization
