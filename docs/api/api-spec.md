API 연동 스펙 — 백엔드팀 전달용

프론트(F1~F4, F6)는 이미 develop 브랜치에 구현 완료. 아래 5개 API가 이 스펙대로 만들어지면 js/api.js의 USE_MOCK = false 한 줄만 바꿔서 즉시 연동됨 (프론트 코드 수정 불필요).

우선순위: 1번(context)이 가장 급함 — F3가 핵심 데모 화면. 나머지는 mock으로 데모해도 무방.

1. GET /api/context/{contextIdentifier} — F3 컨텍스트 카드 ★최우선
   요청: path variable contextIdentifier (예: PJ-014)

응답:

{
"entity": { "id": 10, "code": "PJ-014", "name": "인증 시스템" },
"owner": { "name": "김도현 개발자", "role": "백엔드 개발자", "years": "4년차" },
"aiCategory": "인증/로그인",
"hopDepth": 3,
"chain": [
{ "type": "decision", "text": "...", "date": "2025-05-07", "depth": 1 },
{ "type": "reason", "text": "...", "depth": 2 },
{
"type": "evidence",
"text": "...",
"source": "...",
"originalText": "...(80자 이상이면 프론트에서 요약 트리거)",
"depth": 3
},
{ "type": "decision", "superseded": true, "text": "...", "date": "...", "source": "...", "depth": 1 }
],
"related": [
{ "code": "PJ-021", "name": "결제 모듈", "date": "2025-06-14", "note": "정기결제 로직 변경" }
]
}
참고: chain은 08번 기능명세서 기준 3-hop 재귀쿼리 결과를 이 형태로 매핑. type은 decision/reason/evidence 셋 중 하나. originalText는 evidence 타입에만 있어도 됨(없으면 프론트가 요약 안 함). superseded: true면 프론트에서 취소선 처리됨.

참고 파일: mock/context.json (실제 응답 예시 그대로 3개 프로젝트 분량 있음)

2. POST /api/ownership-transitions — F2 이관
   요청:

{ "entityId": 10, "previousOwnerId": 1, "nextOwnerId": 2 }
응답:

{ "id": 101, "transitionedAt": "2026-08-24T09:00:00" }
3. POST /api/questions — F4 질문 기록
   요청: js/question.js에서 실제로 보내는 payload 필드명 확인 필요 (프론트 쪽에서 재확인해서 추가 공유 예정)

응답: { "id": "...", ... } 형태, 구체 필드는 프론트 재확인 후 확정

4. POST /api/classify — F1 미분류 큐 자동분류 (선택, mock으로도 데모 가능)
   요청:

{ "text": "그거 OAuth 쪽으로 바꾸는 게 나을 것 같은데요", "source": "Slack" }
응답:

{ "type": "decision", "confidence": 75 }
type은 decision/reason/evidence/ignore/unknown 중 하나, confidence는 0~100.

현재 상태: js/classifier.js(키워드 규칙 기반)가 이 API 없이도 프론트 단독으로 동작 중. 백엔드/LLM 연동은 급하지 않음.

5. POST /api/summarize — F6 요약 (선택, mock으로도 데모 가능)
   요청:

{ "text": "80자 넘는 원문..." }
응답:

{ "summary": "축약된 텍스트…", "wasSummarized": true, "originalLength": 134 }
현재 상태: js/summarizer.js(임계값 80자 규칙)가 이 API 없이도 프론트 단독으로 동작 중. 급하지 않음.

연동 전환 방법 (백엔드 완성 후)
js/api.js 상단:

const USE_MOCK = true; // ← 이걸 false로 변경
이 한 줄만 바꾸면 5개 함수(getContext, postHandoff, postQuestion, classifyText, summarizeText)가 전부 실제 API를 호출하게 됨. 프론트 코드 추가 수정 불필요.

전달 시 꼭 확인해야 할 것
필드명을 스펙과 정확히 일치시켜야 함 (예: code가 아니라 projectCode로 만들면 화면이 조용히 깨짐, 별도 에러 없이 빈 값으로 렌더링됨)
응답 형식이 스펙과 다르면 브라우저 콘솔에 [API] context 실제 API 미응답, mock으로 폴백 경고가 뜨니, 개발 중 콘솔 확인 권장

외부 시스템(Jira/GitHub) 연동 스펙은 [api-contract.md](./api-contract.md) 참고.