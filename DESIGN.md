# Design

## Direction

A minimal personal card over a full-screen ink simulation, with a secondary lab
panel. Four green LCD tones, readable pixel typography, stepped details and
flat surfaces establish the monochrome pixel aesthetic.

The running application is the visual reference. [src/styles.scss](src/styles.scss)
is the source of truth for palette tokens, typography, spacing and breakpoints.
Canvas rendering lives in [public/art](public/art).

## Color and typography

Use the shared four-tone palette for both interface and graphics: light paper,
dark ink, secondary text and an intermediate dither tone. Primary actions invert
paper and ink. Preserve visible keyboard focus and readable text contrast.

Dark mode reverses the four existing palette tones: paper and ink swap, as do
secondary text and dither tones. Apply the same mapping to canvas artwork,
including paused scenes. Follow the system by default; the masthead theme control
cycles Auto → Light → Dark → Auto and remembers explicit choices. Apply the saved
choice before the first paint.

Use bundled Early GameBoy for interface text and numerals. Use sizes in 8px
increments: 16px text, 24px measurements and 32px large headings. Keep the regular
weight, avoid synthetic bold, and use tabular numerals for changing measurements
and time. Keep a monospace grid for ASCII artwork. Keep the greeting dominant, biography comfortable to read and
widget labels compact. Preserve the font license in `public/fonts/`.

## Composition

- Present the greeting, biography, workplace and contacts in one narrow column.
- Place the signature, theme button and motion control in the masthead; anchor **Open lab** at
  the bottom center.
- Keep calm regions in the background around text and controls.
- Open the lab as a bottom panel with a double top border and dimmed backdrop.
  Use up to four widget columns on wide screens and two on narrow screens.
- Keep content readable without horizontal scrolling. Long labels wrap within
  their widget; overflow belongs inside the panel.

Use stepped button contours and dividers, square corners and dotted separators.
Depth comes from borders and the backdrop rather than shadows or blur.

## Interaction

The lab uses a native modal dialog. Close it with its button, Escape or a backdrop
click, and return focus to the opener. Each widget keeps its loading, empty and
error states within its tile.

Use pointer movement, touch and Enter/Space to trigger fading ripples in widget
art. Steam uses the supplied icon with a deterministic graphic fallback. Time
uses an hourglass; Spotify uses a stationary record to represent listening history,
with the tonearm lifted for an empty history.

## Motion

The background responds to pointer movement over free space; holding the pointer
adds ink. Text and controls remain outside the interaction area. Render widget
art through the same four-tone ordered dithering treatment.

The motion control and `prefers-reduced-motion` stop decorative animation while
textual time remains current. Pause drawing when the page is hidden and release
widget resources when the lab closes. Keep the signature glitch brief and preserve
its position and legibility.

## Interaction feedback

Buttons depress by two pixels on activation and settle quickly. The lab enters
from the bottom in 320ms and exits in 180ms; its content remains mounted until
the exit completes. A new open request reverses an unfinished exit. Widget
entries are staggered by 30ms, capped at 90ms. The backdrop fades with the panel.
Reduced motion and the pause control remove these decorative transitions while
keeping focus and color feedback visible.
