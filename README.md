# Tone Police Study Hub

A calm, mobile-first language study companion. Plain HTML, CSS and vanilla JavaScript; no build step, backend, account, paid service or external runtime dependency. British English throughout, Helvetica typography at a compact reading size, with muted Morandi colours and an original fine-line SVG owl.

## File tree

```text
study-hub/
  index.html
  styles.css
  app.js
  assets/owl.svg
  data/today.json
  data/goals.json
  data/decks/english.json
  data/decks/cantonese.json
  data/decks/japanese.json
  data/decks/korean.json
  .nojekyll
  README.md
```

## Publish on GitHub Pages, step by step

1. Sign in to GitHub as `junnaifj` and create a repository named **study-hub**. Choose **Public** for GitHub Free Pages hosting. If the repository already exists, retain its existing content and add these files deliberately.
2. Upload the contents of this directory to the repository root. `index.html` must sit at the root, beside `styles.css`, `app.js` and `data/`; do not add an extra enclosing `study-hub` directory. Include `.nojekyll` (an empty file).
3. Commit the files to **main**.
4. Open **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **Deploy from a branch**.
6. Select branch **main** and folder **/ (root)**, then **Save**.
7. Wait for the Pages deployment to finish. Open `https://junnaifj.github.io/study-hub/`. The Pages settings screen shows the confirmed address; deployment timing varies.
8. Check Today, a flashcard and a quiz on your phone. If this is your first use of recording, allow microphone access when you press Record.
9. Send Tone Police the Pages address and the repository identifier `junnaifj/study-hub`. Configure the tutor's GitHub access separately so it can commit lesson updates. This app itself contains no GitHub token or password.

Official instructions: [Configure a GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### Local preview

From this directory, run `python3 -m http.server 8000`, then visit `http://localhost:8000/`. This is a development preview only; deployment needs no Python or build tools. Opening index.html directly as a file will not reliably load JSON or allow recording.

## Everyday use

- **Today:** open your resources, read the passage, reveal its gloss, practise speaking and tick off tasks. Each task has an independent completion checkbox. A fully answered quiz is also marked complete automatically; a completed flashcard queue offers a completion button.
- **Cards:** filter by language and topic. Due cards appear before new cards. Reveal a card, then choose Again, Hard, Good or Easy. Again puts the card at the back of the current queue. Space flips; 1–4 rates the revealed card when focus is outside an input or control. A focused flip button also works with Space or Enter.
- **Quiz:** answer one question at a time, then read the explanation. Typed answers ignore case, spaces and punctuation using Unicode normalisation. Jyutping letters and tones are checked separately. Completed answers are retained for the lesson; reloading does not reset a quiz.
- **Speaking:** start or pause the countdown. Recording is optional and separate from the countdown. Stop recording, listen back and download the audio if you wish to keep it. Add one line of self-feedback.
- **Finish session:** check the editable **Minutes studied** field, then copy the tutor summary or download progress.json. Until you edit it, the field shows the current suggestion: the larger of rounded active minutes and the sum of the minutes on completed link tasks. Finishing again uses the updated suggestion. A manual edit is saved in the session draft, immediately updates both the export and the summary, and stays fixed on later finishes. Minutes restored from imported progress count as edited. Only whole minutes are accepted. Finishing again updates the same date/slot record rather than adding a duplicate.
- **Progress:** view finished sessions, current streak, minutes per language, cards learned, recent quiz scores and tutor-maintained goals.

The seeded lesson is dated **22 October 2026**, the first day in the supplied plan. A notice appears whenever the lesson date differs from the current Hong Kong date. Replace it with a current lesson when ready.

## Updating lessons: instructions for Tone Police

Only the contents of `data/` need to change day to day. Commit updates to `main`; GitHub Pages republishes them. The intended tutor schedule is weekdays around 09:10 and 20:35 Hong Kong time. The static website does **not** schedule commits or run the tutor automatically.

On each page load, JSON files are fetched with `?v=<timestamp>` and `cache: no-store`. There is no service worker or offline cache.

Keep the following schemas and field names exactly as supplied. Do not introduce API keys or private records into this public repository.

### data/today.json — studyhub.today.v1

Required top-level fields: `schema`, `date` (YYYY-MM-DD), `slot`, `tracks`, `minutes`, `new_cards_limit`, `note`, `tasks`.

- `slot`: `morning`, `evening` or `weekend_test`.
- `tracks`: one or more of `english`, `cantonese`, `japanese`, `korean`.
- Every task has a unique non-empty string `id` and one of these types:
  - `link`: `title`, `url` (http/https), `minutes`.
  - `cards`: `deck` (a supported track), `tags` (array, including an empty array when no tag restriction is needed). Multiple tags match cards with any of those tags.
  - `reading`: `title`, `lang`, `lines`; each line has `text`, with optional `gloss` and `translation`.
  - `speaking`: `prompt`, optional positive integer `seconds` (defaults to 60).
  - `quiz`: `questions`; each question has a unique `id` across the lesson, `type`, `q`, `answer`, `explain`.
- `mc`: include `options` and a **zero-based** integer `answer`.
- `typed`: `answer` is a non-empty **array of strings**, including when only one answer is accepted.
- `tone`: `answer` is an integer from 1 to 6.
- `new_cards_limit` is a non-negative integer. The limit applies across tracks **per lesson**, keyed by `${lesson.date}|${lesson.slot}`. Morning, evening and weekend_test have separate allowances; changing a filter or refreshing the same lesson does not reset its allowance.

The shipped `data/today.json` is a complete example of every task and question type.

### data/decks/<track>.json — studyhub.deck.v1

Top-level fields: `schema`, `track`, `cards`. Each card has `id`, `front`, `back`, `gloss`, `lang`, `tags`. Use permanent string IDs unique across all decks. Add cards or edit text; never reuse an ID for a different card.

`lang` can be `yue-HK`, `zh-HK`, `ja-JP`, `ko-KR` or `en-GB`. A Play button appears only if the browser reports a matching installed voice. Cantonese accepts `yue-HK` or `zh-HK`; Mandarin voices are not substituted. Voice availability and speech processing are controlled by the browser/operating system. The app uses no speech service credentials or paid API.

### data/goals.json — studyhub.goals.v1

Fields: `schema`, `end`, `goals`. Each goal has `track`, `label`, `target`, `done`. The tutor owns `done`. Goals are shown as provided; the app does not infer goal counters from natural-language labels.

## Progress, export and restoration

All study progress and draft state are stored under browser localStorage key **studyhub.v1**. Additional private `_ui` metadata in this local record tracks unfinished tasks, active minutes, answers, rating counts, chosen session minutes, imported content and per-lesson new cards. It is **omitted** from progress exports. No credentials are stored.

Downloaded **progress.json** contains exactly these top-level fields:

```json
{
  "schema": "studyhub.progress.v1",
  "exported_at": "2026-10-22T21:00:00+08:00",
  "streak_days": 1,
  "cards": {
    "yue-0001": {
      "reps": 2,
      "lapses": 0,
      "ease": 2.5,
      "interval_days": 3,
      "due": "2026-10-25",
      "last_rating": "good",
      "last_seen": "2026-10-22"
    }
  },
  "sessions": [
    {
      "date": "2026-10-22",
      "slot": "morning",
      "tracks": ["english", "cantonese"],
      "minutes": 18,
      "tasks_done": ["t1", "t2", "t4"],
      "quiz": { "score": 4, "total": 5, "wrong": ["q2"] },
      "speaking_self_note": "Too many 'um's in the Result part.",
      "notes": ""
    }
  ]
}
```

The example above illustrates the export contract, not a claim about the current sample lesson's results. Field names and types match specification section 5.3.

The **Copy summary for Tone Police** format is:

```text
STUDYHUB 2026-10-22 morning | 18 min | tasks t1,t2,t4 done, t3 skipped
quiz 4/5 wrong: q2
cards: 12 reviewed (again 2, hard 3, good 6, easy 1), new 5
hard cards: yue-0004, yue-0006
note: Too many 'um's in the Result part.
```

Task IDs in the actual summary are derived from all tasks in the actual lesson. `none` denotes an empty list. Reviewed counts are rating attempts; Again may cause repeated attempts on the same card. Hard cards are unique IDs rated Again or Hard during the session. Multiple speaking notes and the optional session note share the final `note:` line.

- Download progress before changing devices. On the other device, use **Settings → Import progress**. Import validates the file and asks before **replacing** current records; it does not merge two histories.
- Progress exports contain finished sessions and all saved card schedules. Finish first to include an unfinished session. Recordings, unfinished question details and per-session rating counts are not part of the specified export format.
- Imported session quiz totals are retained; the export cannot reconstruct the original per-question responses or rating counts. A completed new quiz replaces the imported quiz aggregate.
- A restored current session recovers task ticks, minutes, notes and self-feedback. Some live-only details (recordings and per-rating counts) are unavailable after a device transfer.
- **Import lesson** accepts either `studyhub.today.v1` lessons or `studyhub.deck.v1` decks. Each deck is validated against its own `track` and stored under `db._ui.importedDecks[track]`. An imported deck replaces that track’s published deck only when it has strictly more cards, or when the published deck failed to load or validate. Equal-sized or smaller imports are retained locally but do not override a valid published deck. Other tracks are unchanged. Duplicate card IDs across tracks are rejected before an import is saved; if a future published update creates a collision, the conflicting local override falls back to published data (or is excluded if no valid fallback exists), with an error notice. **Reload published decks** clears these local deck imports and reloads the existing published data URLs.
- On load, a valid published lesson replaces a local imported lesson only when it is strictly newer, comparing `date` first, then `morning < evening < weekend_test`. The same date and slot keeps the import. When the published lesson is strictly newer, the import is removed from storage and a toast says **“A newer lesson from Tone Police is available and loaded.”** A newer local import stays in use; so does a valid local import when the published lesson is unavailable or invalid. **Reload published lesson** explicitly clears the lesson import.
- Replacing progress preserves local imported lessons and decks; they are content, not exported progress.
- Hong Kong time is used for due dates, streaks and weekly boundaries (Monday–Sunday). Session dates come from the lesson; card review dates come from the actual calendar day. Avoid practising a wrongly dated lesson when accurate daily session statistics matter.
- A streak counts consecutive finished-session dates ending today or yesterday. Cards learned are cards with at least one successful repetition (`reps > 0`). Active time is measured while the page is visible; after two minutes without interaction, time stops accruing. Exported minutes use the value saved in **Minutes studied**, which can also account for external resources. Until that field is edited, the suggested minutes are the larger of rounded active minutes and completed link minutes, and a later finish uses the updated suggestion. A manual edit stays fixed. Minutes restored from imported progress count as edited. Only whole minutes are stored. Mixed-track minutes are divided equally because the v1 session schema has no per-task track timing.

## Spaced repetition

New cards start with ease 2.5 and interval 0.

| Rating | Next interval | Other changes |
| --- | --- | --- |
| Again | 0; back into this session | lapses +1, ease −0.2, reps resets to 0 |
| Hard | max(1, old interval ×1.2) | ease −0.15, reps +1 |
| Good | 1 for interval 0; then 3; then interval × ease | reps +1 |
| Easy | Good's result ×1.3 | ease +0.15, reps +1 |

Intervals are rounded to whole days and capped at 60. Ease never falls below 1.3. Due = actual Hong Kong date + interval. Good's result uses the ease before the current rating changes it. Cards rated Again remain due even after a refresh. Introduced card IDs are stored under ``db._ui.introduced[`${lesson.date}|${lesson.slot}`]``. Old calendar-day counters are migrated from each lesson draft’s known new-card IDs, without charging another slot. Imported v1 progress cannot reveal per-lesson introduction history: for an already finished matching lesson only, cards last seen on the lesson date are conservatively counted towards its allowance. A different slot starts with its own allowance; already reviewed cards retain their existing schedules. This internal metadata is never added to progress.json or the copy-summary text.

## Privacy and browser support

The app has no analytics, advertising, remote application scripts, server storage or AI calls. Public lesson files are downloaded from the website's own host. Linked resources open external websites. Recording audio is held in this tab's memory and is never uploaded; download it before closing the tab. Microphone access requires HTTPS (provided by GitHub Pages) or localhost and a supported browser. Denied permission does not block the other features.

Browser storage belongs to an origin: a local preview, a Sites preview and GitHub Pages have separate records. Use progress export/import to transfer records. Private browsing or clearing site data can remove progress. A visible warning appears when storage is unavailable.

## Validation and navigation

Invalid lesson/deck imports leave the existing content intact. Validation errors identify the failing task, question or card and its field, for example `Question q3: missing explain` or `Task t2: missing deck`. Where an ID itself is missing, the error gives the position in the file.

After checking a quiz answer, the feedback is scrolled into view. Main content and quiz-feedback scrolling reserve the measured bottom-navigation height plus the device safe area, so the final buttons can be scrolled above the navigation. Reduced-motion preferences are respected.

## Verification

The implementation is exercised with browser automation at phone and desktop widths, including scoring, Jyutping tone feedback, card schedules, task completion, refresh persistence, JSON export/import, reading glosses and a simulated microphone recording. Simulated recording checks the app flow; microphone permissions, installed speech voices and audio quality still need checking on the device you actually use. There is no build or package installation required to use this site.
