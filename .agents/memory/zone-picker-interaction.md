---
name: Zone seller picker interaction
description: User-reported blinking in zone assignment menus inside the scheduling dialog.
---

Use inline expandable choices for zone seller assignment rather than relying on floating or native dropdown menus inside the scheduling modal.

**Why:** The user reported blinking both before and after the switch to native selects in the embedded preview. Missing expected users was a separate finding, not an explanation of the blinking. The precise browser cause was not reproduced in an authenticated browser.

**How to apply:** Keep options inside the dialog and preserve their expanded state across saves and data refreshes. Do not claim visual verification based only on component tests.
