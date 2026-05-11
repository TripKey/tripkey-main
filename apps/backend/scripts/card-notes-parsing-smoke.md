# Card Notes Parsing Smoke Test

이 스크립트는 실제 백엔드 API를 대상으로 card-level notes parsing 연동을 확인한다.

## 실행 전 준비

1. 백엔드가 떠 있어야 한다.
2. 테스트할 trip/card가 이미 있어야 한다.
3. 대상 card는 아래 중 하나여야 parsing이 트리거된다.
   - `undecided + needs_input`
   - `undecided + ready_partial`
   - `processing_status = failed`

## 실행

```bash
  TRIP_ID=<trip_uuid> \
  CARD_ID=<card_instance_uuid> \
  NOTES="친구 집은 오사카 난바역 근처야" \
./apps/backend/scripts/card-notes-parsing-smoke.sh
```

  TRIP_ID=860c07d9-2c52-47c7-bafb-108d22cd1ef0 \
  CARD_ID=c6970aa9-09f6-4a57-a288-d9720c722155 \
  NOTES="오사카에 있는 키지 오코노미야끼 집으로 갈거야" \
./apps/backend/scripts/card-notes-parsing-smoke.sh

다른 환경 URL을 쓰려면:

```bash
BASE_URL=https://your-backend.example.com/v1 \
TRIP_ID=<trip_uuid> \
CARD_ID=<card_instance_uuid> \
NOTES="도톤보리 글리코 사인으로 갈게" \
./apps/backend/scripts/card-notes-parsing-smoke.sh
```

## 확인 포인트

PATCH 직후:

- eligible card면 `processing_status = processing`
- `open_question` 또는 `confirmed` card면 notes 저장만 되고 parsing이 트리거되지 않는다.

Polling 완료 후:

- AI parse 성공 + Places 성공:
  - `classification = confirmed`
  - `processing_status = completed`
  - `place_id / address` 존재 가능

- AI parse 성공 + Places 실패:
  - `classification = confirmed`
  - `processing_status = failed`
  - `place_id / address = null`

- AI parse 실패 또는 non-confirmed 응답:
  - 기존 `classification / placement_status` 유지
  - `processing_status = failed`

## 추천 수동 케이스

1. 정상 장소 입력

```bash
NOTES="도톤보리 글리코 사인으로 갈게"
```

2. 이상한 입력

```bash
NOTES="asdf ㅁㄴㅇㄹ"
```

3. open_question 카드에 notes 저장

```bash
NOTES="여기는 포함해줘"
```

3번은 AI parsing이 트리거되지 않아야 한다.
