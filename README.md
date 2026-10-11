# Carom

Carom is a fast top-down paddle duel for the browser. Curve the ball with paddle motion, thread shots around two midfield obstacles, and win the first-to-11 match by two points. Play solo against the reactive AI or share a keyboard for local versus.

## Run locally

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. For a production build, run `npm run build`; the self-contained static site is emitted to `dist/`. Check that build locally with `npm run preview`.

## Controls

- Left paddle: `W` / `S`
- Right paddle: `↑` / `↓`
- Confirm: `Enter` or `Space`
- Pause/back: `P` or `Escape`
- Mute: `M`

In Solo, either pair of movement keys controls the left paddle. Move while returning the ball to add spin: downward motion curves it clockwise and upward motion curves it counterclockwise.

## Quality checks

Run `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test` to execute the repository checks.
