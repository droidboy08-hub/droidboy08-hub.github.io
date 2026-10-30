# TitleLess — web visual language

The site is the app's glass on a white ground. Every value below is taken from
the shipping app, not invented for the web, so the two never drift apart.

## The one rule

**A white room, glass objects.** The page is near-white with faint colour
blooms in the corners. Everything that holds content — nav, card, footer,
button — is a pane of white glass floating on it. Nothing else draws a box.
If a thing needs a border, it is glass; if it is not glass, it has no border.

## Tokens

All defined at the top of `assets/site.css` as CSS custom properties.

### Ground
| Token | Value | Use |
|---|---|---|
| `--ground` | `#F4F4F7` | page base. Never pure white — white glass must sit *on* something |
| `--ground-2` | `#ECECF1` | bottom of the page ramp |

Behind everything, `body::before` paints four soft radial blooms from the app's
own wallpaper presets (`Wallpaper.swift`), at 28–44% strength. They exist so the
glass has something to refract; they must stay pale enough that black text on
glass keeps its contrast.

### Ink
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0B0B0D` | headings, body. This is the "Ink" wallpaper's first stop |
| `--ink-2` | `#55565F` | secondary text, paragraph copy |
| `--ink-3` | `#8A8B95` | captions, fine print |

### Accent
| Token | Value | Use |
|---|---|---|
| `--accent` | `#0A84FF` | iOS system blue: links, settings values, primary button |
| `--on` | `#30D158` | iOS system green: a toggle that is on. Nothing else |

Colour carries meaning only. A card is never tinted to be decorative.

### App gradients (backdrop only)
Straight out of `Wallpaper.swift`:
`Dusk #1B2A4A → #5B3A78 → #C2557A` · `Tide #08243B → #1B6E8C → #7FD4D0` ·
`Bloom → #F2A0B6` · `Ink #0B0B0D → #2B2B31 → #4A4A55`.

### Glass
| Token | Value | Mirrors |
|---|---|---|
| `--glass` | `rgba(255,255,255,.55)` | the app's See Through scrim over clear glass |
| `--glass-strong` | `rgba(255,255,255,.72)` | nav and buttons — chrome you read *on* |
| `--glass-well` | `rgba(255,255,255,.40)` | a group inside a card, like a settings well |
| `--glass-blur` | `saturate(180%) blur(24px)` | `UIGlassEffect`'s nearest web equivalent |
| `--rim` | `rgba(255,255,255,.85)` | the lit top edge. Top border only, never all four |
| `--hairline` | `rgba(11,11,13,.07)` | the other three edges |

A glass pane is: background + backdrop-filter + hairline border with a lit top
edge + one soft shadow. Never two shadows, never a gradient border.

### Geometry — the app's radii, unchanged
| Token | Value | In the app |
|---|---|---|
| `--r-card` | `28px` | Home panel, download card, `GlassSurface.makeView(radius: 28)` |
| `--r-panel` | `22px` | the pages footer, secondary panels |
| `--r-row` | `14px` | a row or icon tile inside a panel |
| `--r-capsule` | `999px` | the address capsule: always height ÷ 2 |

Corner radius is structural. A thing's radius says what size of object it is —
never round something more to make it look friendlier.

### Type
- Headings: `ui-rounded, "SF Pro Rounded"` at weight 800, tracking `-0.02em`.
  This is the app's `rounded(27, .bold)` title face.
- Body: the system text face, 17px / 1.55 — iOS body size.
- Numbers in chips: tabular.

### Spacing
Gutter 20px · content max width 1080px · section rhythm
`clamp(64px, 9vw, 128px)` · card padding 26px · prose max width 68 characters.

## Components

| Class | What it is |
|---|---|
| `.glass` | the one surface. `--strong` and `--panel` are its weights |
| `.nav` | capsule glass bar, sticky at the top |
| `.btn--primary` | blue capsule, 52px tall |
| `.btn--ghost` | glass capsule, same height |
| `.chip` | a small capsule floating off the phone — the app's capsule idiom |
| `.rows` / `.row` | a settings list: title, optional hint, value in blue or a toggle |
| `.toggle` | 51 × 31 iOS switch, green when on |
| `.phone` | a screenshot in a glass bezel, radius 46/38 |
| `.release` | one changelog entry |

## Rules of thumb

1. **One surface per screen region.** Boxes inside boxes use `--glass-well`, not
   a second sheet of glass, exactly as the app does.
2. **Motion is a nudge.** 1px lift on hover, 150ms. Nothing slides in on scroll.
   `prefers-reduced-motion` turns all of it off.
3. **The site is white only.** The app owns light *and* dark; the site is one
   white room so the screenshots inside it are what carry colour.
4. **Never fake the app.** Feature copy describes what the build does. If a
   feature is cut, the line comes out.
