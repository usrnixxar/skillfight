# Skillence Typing Battle

A lightweight, responsive typing-fighting game for Skillence Academy students.

## Playable now
- Home screen: Play, Settings, Quit
- Normal Play: Easy / Medium / Hard bot opponents with randomized WPM bands
- One shared word per round. Finish typing correctly before the bot to score a hit.
- First to three successful hits wins, with rematch, score, sounds and keyboard controls.
- Student login navigation and private-room creation/join forms (UI demonstration).

## Not yet connected
- Student PIN verification: currently **demo navigation only**. Any 1–6 digit PIN can unlock the preview; do not use as actual authentication.
- Room functionality: generates an example code locally; it does **not** create a live room or connect other devices.
- Public matchmaking and multiplayer APIs: coming soon.

For secure multiplayer, use an authenticated backend (e.g. Supabase Auth and Realtime or a WebSocket game service), store PINs securely using appropriate server-side hashing, validate room membership and rate-limit guessing. Make the server authoritative for typing completion and scoring.

## Run locally
No build required. Open `index.html` in a browser, or serve with a simple static HTTP server.

## Publish
This is a static website and works with GitHub Pages or a Vercel static project. For GitHub Pages: Repository > Settings > Pages > Deploy from branch > main > /(root) > Save. Wait for GitHub Pages to finish publishing and use the URL shown in Settings > Pages.

## Game balance
Bot WPM ranges are Easy: 16–27, Medium: 30–44, Hard: 48–68. These are adjustable in the script in `index.html`.
