# 3D Zoo

A black-and-white zoo tycoon game that runs in the browser. Lay paths and fences, build exhibits, fill them with what each animal wants, hire staff, and keep guests coming through the gate.

Play it by opening `index.html`, or publish it with GitHub Pages (below).

## How it plays

- **Paths** connect everything to the entrance. Guests only walk on paths.
- **Fences** make exhibits. An exhibit is grass that's fully closed in by fence, with a path running right beside it so keepers can get in.
- **Items**: tree, bush, water, and toy. Each species wants a few of these in its exhibit.
- **Animals** need what they want, enough room, food, and a clean exhibit. All four feed their happiness.
- **Keepers** feed animals and clean exhibits. **Janitors** sweep litter off the paths. Both are paid daily wages.
- **Guests** pay a ticket at the gate. That's the zoo's main income. Happy animals and clean paths raise the rating, and a higher rating brings more guests. Higher ticket prices bring fewer guests.
- **Babies**: two happy adults of the same species, with room to spare, may have a baby at the end of a day. Babies grow up in 4 days and draw extra attention from guests.
- **Selling**: an animal can go to another zoo, but you only get back 15% of its price (10% for a baby).

Controls: drag to move around, scroll or pinch to zoom, space to pause, Esc to go back to the Look tool. Click anything with the Look tool to inspect it.

## Animal approval

Every animal's adult and baby art must be approved before it appears in the game. Approval lives in `js/animals.js`:

```js
const APPROVED = {
  lion: { adult: true, baby: true },
  ...
};
```

- If an adult isn't approved, it shows as "Awaiting approval" in the shop and can't be bought.
- If a baby isn't approved, that species can't have babies.

`approve.html` shows every animal walking with its baby, plus its current approval status.

## Saving

- The game saves to the browser at the end of every in-game day, every 30 seconds, and when you close the tab.
- Saves stay on that device and browser.
- To move a zoo to another device, use **Menu → Export save file**, then **Import save file** on the other device.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The game page and its layout |
| `approve.html` | Animal approval sheet |
| `js/animals.js` | Animal art, walk cycles, species data, approvals |
| `js/world-art.js` | Trees, bushes, water, toys, people, litter, entrance |
| `js/game.js` | Map, exhibits, guests, staff, money, breeding, saving |

There's no build step and nothing to install.

## Publishing on GitHub Pages

1. Create a new repository on GitHub, for example `3d-zoo`.
2. Choose **Add file → Upload files**. Drag in `index.html`, `approve.html`, `README.md`, and the whole `js` folder, then commit.
3. Go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, then `main` and `/ (root)`, and save.
4. After a minute the game is live at `https://<your-username>.github.io/3d-zoo/`.
