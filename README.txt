Elm Street / Dream Warriors Demon Fighter — portable source export
Version 29. Exported October 30, 2026.

FILES
index.html: page markup
style.css: styling
game.js: combat, rendering, audio and game logic
front.js: opening screen, intro, character selection and tournament flow
PNG/JPG images and audio/: required game artwork and sound

MOVE TO ANOTHER WEBSITE
1. Extract this ZIP.
2. Upload ALL files and the audio folder to the same folder on your web host.
3. Open index.html through your website URL. No build step or npm install is required.
4. Preserve filenames, capitalization and relative folder paths.
For a subfolder such as /elm-game/, upload this package there and visit /elm-game/.

LOCAL PREVIEW
From the extracted folder, run: python -m http.server 8000
Then visit http://localhost:8000 in your browser.
Use HTTP hosting rather than double-clicking index.html so fetched audio works reliably.

EXISTING SITE BUILDERS
If your builder accepts only an HTML embed, host this whole folder first, then embed its URL in an iframe.
Example: <iframe src="/elm-game/" title="Dream Warriors Demon Fighter" style="width:100%;height:850px;border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>

NOTES
The CSS imports Google Fonts; fallback fonts are used if that service is unavailable.
Audio begins after the opening user interaction, subject to browser autoplay rules.
This is a source export, with no gameplay changes. Gameplay was not browser-tested during export.
