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

Use self-hosted Geist Mono for body copy, controls, widget titles and metadata.
Use Geist Pixel Square only for the greeting, signature, lab heading and large
numeric values. Keep Pixel at its real 400 weight; Mono uses 400 for prose,
500 for actions and workplace emphasis, and 600 for widget titles and labels.

Typography roles are defined in `src/styles.scss`: a responsive 48–72px greeting,
28px lab heading, 28–32px numeric values, 17–18px biography and widget titles,
16px controls, 14px supporting text and 12px labels/timestamps. Use rem-based
sizes so browser font preferences and zoom remain effective. Biography measure
is capped at 54ch with 1.75 line height. Separate context, primary information
and update timestamps with spacing as well as size; never flatten all widget
copy into one visual role. Keep tabular numerals and preserve the bundled OFL
license in `public/fonts/`.

## Composition

- Present three separate groups in one narrow column: greeting with biography,
  workplace, and contacts. Use open 64px gaps (48px on mobile), without dividing
  lines. Give each group its own quiet background region so ink flows through
  the spaces between them.
- Place a prominent pixel D / S monogram with the full name as a small adjacent
  caption, the theme button and motion control in the masthead; anchor **Open lab** at
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
uses an hourglass; Spotify uses a rotating record with its tonearm over the groove when listening
history contains a track. This is decorative motion, not a live playback claim;
the last-played timestamp remains visible. Empty history keeps the record still
and the tonearm lifted. The global pause control and reduced-motion preference
freeze rotation without changing the listening-history state.

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
