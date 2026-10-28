# Vocābula

Latin vocab flashcards for Latin 1 (Vocab Quizzes 1 to 4, door and window sets), part of [Linguae](https://janavduraikkannan.github.io/linguae/).

Live at https://janavduraikkannan.github.io/vocabula/

- **Type, check, rate.** Type the word (a hyphen after a vowel makes a macron: `a-` → `ā`), press Enter, compare, and rate how well you knew it from 1 to 5.
- **Two schedulers**, switched at the bottom of the home page (every rating updates both, so switching loses nothing):
  - **New:** FSRS-6 through [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) 5.4.2 (MIT, vendored in `vendor/`), default weights, 90% desired retention. Ratings 1–2 count as forgotten, 3 = Hard, 4 = Good, 5 = Easy. Cards rated below 5 come back after a few other cards; a new word arrives only once every card in the cycle is at 5; due cards come before new words.
  - **Legacy:** the first version's Brainscape-style scheduler, counted in cards: a 1 returns after about 3 cards, a 5 after about 50, repeated 4s and 5s stretch further, and a new word comes at least every fifth card.
- **Accounts.** The same account as Verba and the other Linguae sites (`verba-account` in the browser). Progress is saved in `vocab/{account key}` in Firestore project `verba-791ca`, never in the account document. No leaderboard.
- **firestore.rules** is the shared file from every Linguae repository. After changing it, publish it in the Firebase console and copy it to every repo.

Files: `index.html` (page and styles), `app.js` (screens, saving, account), `engine.js` (word lists, both schedulers, card picker; runs in Node for tests), `vendor/` (ts-fsrs). Fēlix art from Verba; icons from game-icons.net (CC BY 3.0).
