# 커밋 메시지 컨벤션

```
[이름] 작업내용 타이틀

* 세부내용1
* 세부내용2
```

- `[이름]` = **브랜치 이름에서 `/` 뒤 부분**(브랜치 *종류*가 아니라 그 브랜치의 고유 이름). `feature`/`fix` 같은 종류는 적지 않는다.
  - `feature/attendance-api` → `[attendance-api]`
  - `feature/login-screen` → `[login-screen]`
  - `fix/balance-race` → `[balance-race]`
- 제목 줄 다음 **빈 줄 1개**, 본문은 `*` 불릿.
- 본문이 불필요한 1줄짜리 변경은 제목만 허용.
- 한 커밋 = 한 가지 의미 있는 변경.
