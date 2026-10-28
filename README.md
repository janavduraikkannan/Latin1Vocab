# Vocābula

Latin vocab flashcards for Latin 1 (Vocab Quizzes 1 to 4, door and window sets), part of [Linguae](https://janavduraikkannan.github.io/linguae/).

Live at https://janavduraikkannan.github.io/vocabula/

- **Type, check, rate.** Type the word (a hyphen after a vowel makes a macron: `a-` → `ā`), press Enter, compare, and rate how well you knew it from 1 to 5.
- **Scheduling.** FSRS-5, the algorithm Anki uses, with its published default weights (`engine.js`). Ratings 1–2 count as forgotten, 3 = Hard, 4 = Good, 5 = Easy.
- **One cycle at a time.** Cards rated below 5 come back after a few other cards. A new word arrives only once every card in the cycle is at 5. Cards due for review come before new words; when nothing is due, words not yet shown this session come first.
- **Accounts.** The same account as Verba and the other Linguae sites (`verba-account` in the browser). Progress is saved in `vocab/{account key}` in Firestore project `verba-791ca`, never in the account document. No leaderboard.
- **firestore.rules** is the shared file from every Linguae repository. After changing it, publish it in the Firebase console and copy it to every repo.

Files: `index.html` (page and styles), `app.js` (screens, saving, account), `engine.js` (word lists, FSRS-5, card picker; runs in Node for tests). Fēlix art from Verba; icons from game-icons.net (CC BY 3.0).
