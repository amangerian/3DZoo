# 3D Zoo

A black-and-white zoo tycoon game that runs in the browser. Lay paths and fences, build exhibits, fill them with what each animal wants, hire staff, and keep guests coming through the gate.

Play it by opening `index.html`, or publish it with GitHub Pages (below).

## How it plays

- **Zoo stars** (click the stars at the top): you start with 1 star, $15,000, and the four starter animals (zebra, penguin, flamingo, monkey). Each new star needs every goal met at once: rating, guests in one day, guests in the zoo at the same time (up to 1,000 can be in the zoo at once), number of species, and babies born. Each star unlocks more:
  - 2 stars: giraffe, bear, ostrich, sea hawk, parrot, aviary mesh, gift shop. Grass, trees, and bushes turn green.
  - 3 stars: lion, snow leopard, hippo, anaconda, toucan, great horned owl, education center. Water turns blue.
  - 4 stars: elephant, rhino, polar bear, bald eagle. Paths, fences, and buildings get their colors.
  - 5 stars: aquarium tanks, sharks, and orcas. Animals in color (art still to come).
  Earned stars are never lost. Older saves work out their star level when loaded and keep everything already built.
- **Secrets**: a few rare animals are hidden until you find out how to unlock them.
- **Floors**: paint **snow** inside an exhibit for cold animals (penguins, snow leopards, polar bears want at least half the land snowy). Paint **tank water** (at least 12 tiles, inside a fence) for sharks and orcas. Fences beside tank water become glass walls.
- **Sharks and orcas** need lots of room in the tank, expensive food, and a keeper trained to skill 3. Orcas also need another orca for company.
- **Aviaries**: birds that fly (sea hawk, parrot, toucan, owl, bald eagle) can only live in an exhibit closed in with **aviary mesh** all the way around. Paint mesh right over an existing fence to turn a pen into an aviary.
- **Sharing exhibits**: animals that share a habitat in the wild can live together, and enjoy it: the African savanna animals (zebra, giraffe, ostrich, rhino, elephant, hippo) and the rainforest birds (parrot, toucan). Everyone else lives only with their own kind.
- **Trees and toys**: oak, acacia, palm, and pine trees; a ball, an exercise wheel, and a scratching post. Any tree counts as a tree and any toy as a toy, but each animal has favorites that make it a little happier.
- **Escapes**: if a fence comes down, animals get out and wander nearby. Keepers catch them and lead them to an exhibit they can live in.
- **Staff & training**: see everyone you've hired, what they're doing, and train them up to skill 5. Trained staff work faster (and keepers learn special skills), but each level costs more in training and wages.
- **Bottom bar**: three tabs. Build (paths, fences, exhibit items, buildings, remove), Animals, and Staff.
- **Guests** stop at the fence to watch the animals, and linger at their favorites, babies, and happy animals.
- **Paths** connect everything to the entrance. Guests only walk on paths.
- **Fences** make exhibits. An exhibit is grass that's fully closed in by fence, with a path running right beside it so keepers can get in.
- **Items**: tree, bush, water, and toy. Each species wants a few of these in its exhibit.
- **Animals** need what they want, enough room, food, and a clean exhibit. All four feed their happiness.
- **Keepers** carry food into each exhibit and clean up droppings. **Janitors** sweep litter off the paths. Both are paid daily wages.
- **Food** costs money every time a keeper puts it out, and each species has its own diet and price per meal. Animals walk over to the food to eat it.
- **Toys**: animals walk over and play with the ball, run in the wheel, or use the scratching post, which gives them a small happiness boost.
- **Guests** pay a ticket at the gate. That's the zoo's main income. Happy animals and clean paths raise the rating, and a higher rating brings more guests. Higher ticket prices bring fewer guests.
- **Gift shop** (next to a path): guests may buy a stuffed version of their favorite animal and carry it around the zoo.
- **Education center** (next to a path): guests who stop in learn a fact about one of your animals and enjoy the exhibits more afterward.
- **Money and rating**: click the money at the top for an income vs costs chart, or the rating for what's raising or lowering it and what guests are saying.
- **Names**: click an animal to rename it.
- **Moving animals**: click an animal, choose "Move to another exhibit," then click where it should go. A keeper walks it over (tank animals are moved straight across by the aquarium team). The same rules apply as when buying: it has to be an exhibit the animal can live in.
- **Babies**: two happy adults of the same species, with room to spare, may have a baby at the end of a day. Babies grow up in 4 days and draw extra attention from guests.
- **Selling**: an animal can go to another zoo, but you only get back 15% of its price (10% for a baby).

Controls: drag to move around, scroll or pinch to zoom, space to pause, Esc to go back to the Look tool. Click anything with the Look tool to inspect it.

## Animal approval

Every animal's adult and baby art must be approved before it appears in the game. Approval lives in `animals.js`:

```js
const APPROVED = {
  lion: { adult: true, baby: true },
  ...
};
```

- If an adult isn't approved, it shows as "Awaiting approval" in the shop and can't be bought.
- If a baby isn't approved, that species can't have babies.
- New animals start with every flag set to `false`, so they show as "Awaiting approval" until signed off.
- `adultFrontBack` and `babyFrontBack` cover the views of an animal walking toward and away from the camera. If one isn't approved, that animal stays side-on whichever way it walks.

`approve.html` shows every animal walking with its baby, side-on and toward and away from the camera, plus its current approval status.

## Saving

- The game saves to the browser at the end of every in-game day, every 30 seconds, and when you close the tab.
- Saves stay on that device and browser.
- To move a zoo to another device, use **Menu → Export save file**, then **Import save file** on the other device.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The game page and its layout |
| `approve.html` | Animal approval sheet |
| `animals.js` | Animal art, walk cycles, species data, approvals |
| `world-art.js` | Trees, bushes, water, toys, food, buildings, people, litter, entrance |
| `game.js` | Map, exhibits, guests, staff, feeding, money, breeding, saving |

There's no build step and nothing to install.

## Publishing on GitHub Pages

1. Create a new repository on GitHub, for example `3d-zoo`.
2. Choose **Add file → Upload files**. Drag in all six files (`index.html`, `approve.html`, `animals.js`, `world-art.js`, `game.js`, `README.md`) together, then commit. They all go at the top level, with no folders.
3. Go to **Settings → Pages**. Under **Build and deployment**, pick **Deploy from a branch**, then `main` and `/ (root)`, and save.
4. After a minute the game is live at `https://<your-username>.github.io/<repo-name>/`.

## Version history

The version shows in the top bar next to the title and in the Menu. Each release also bumps the `?v=` on the script tags in `index.html` and `approve.html`, so browsers fetch the new files instead of an old cached copy.

- **v1.1** (Oct 8, 2026)
  - The Menu no longer estimates how many guests a ticket price will bring. Finding the right price is up to the player.
- **v1.0** (Oct 8, 2026)
  - Bottom bar split into Build, Animals, and Staff tabs.
  - Zoo stars (1 to 5) unlock animals, buildings, and color. Goals include rating, guests per day, guests in the zoo at once, species, and babies. Starting money $15,000.
  - Color fades in as stars are earned: plants, then water, then paths, fences, and buildings.
  - Guests stop at fences to watch animals, and explore toward exhibits they haven't seen yet. Up to 1,000 guests at once.
  - New animals: hippo, rhino, ostrich, sea hawk, polar bear, anaconda, parrot, toucan, great horned owl, bald eagle, shark, orca, plus three secret animals.
  - Snow floors, aquarium tanks with glass walls, and aviaries with mesh fencing.
  - Oak, acacia, palm, and pine trees; ball, exercise wheel, and scratching post.
  - Mixed exhibits for species that live together in the wild.
  - Escaped animals are rounded up by keepers; animals can be moved between exhibits.
  - Staff training up to skill 5, with ranks and new uniforms at each level.
  - Fixed animals walking through fences.
