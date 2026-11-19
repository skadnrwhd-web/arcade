# UJ ARCADE

Browser games made together with AI, collected in one place.
Play them at https://skadnrwhd-web.github.io/arcade/

- 20 full games (3D puzzles, a pathfinding race, a shooter, a runner, Suika, Gomoku and more) and 3 bonus mini-games — 23 in all
- A no-login message board (nickname only)
- Share with friends on KakaoTalk
- Add to your phone home screen like an app (iPhone: Share → Add to Home Screen)

브라우저에서 바로 하는 게임 모음입니다. 비개발자가 AI(Claude)와 함께 만들었습니다.

Blog: https://blog.naver.com/ujnam2197

## 새 게임을 올리는 법 (도우미 사용)

1. 게임 파일을 `games/<id>.html` 로 넣는다. (id는 영문 소문자·숫자·-)
2. 등록한다. 메인 목록 아이콘, 영어 문구, "N종" 숫자, sitemap, 검색용 목록을 한 번에 넣어 준다.
   ```
   node tools/add-game.js add --id my-game --title "내 게임" --title-en "My Game" --desc "한 줄 설명" --badge 퍼즐 --c1 "#1e1b4b" --c2 "#6366f1"
   ```
   - `--art 그림.svg` 로 아이콘 그림을 넣을 수 있다(320x176 칸, 가운데 약 130px 안에 그린다). 없으면 기본 게임패드 그림이 들어간다.
   - `--dry` 를 붙이면 바꾸지 않고 미리보기만 한다.
3. 빠진 곳 점검: `node tools/add-game.js check`
4. 점수 랭킹이 필요하면 `rank.js` 에 한 줄을 넣는다(등록 후 안내가 출력된다).

아이콘 색은 게임마다 겹치지 않게 고른다. 지금 쓰는 색: 에메랄드, 청록, 갈색, 분홍, 남보라, 파랑, 자홍, 보라, 초록, 노랑, 라임, 짙은 남색, 복숭아, 빨강, 회색, 주황, 연보라, 하늘, 진한 청록, 진홍.
