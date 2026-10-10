# 3D Zoo

A black-and-white zoo tycoon game that runs in the browser. Lay paths and fences, build exhibits, fill them with what each animal wants, hire staff, and keep guests coming through the gate.

Play it by opening `index.html`, or publish it with GitHub Pages (below).

## How it plays

- **Zoo stars** (click the stars at the top): you start with 1 star, $15,000, and the four starter animals (zebra, penguin, flamingo, monkey). Each new star needs every goal met at once: rating, guests in the zoo at the same time, number of species, and babies born. Each star unlocks more:
  - 2 stars: giraffe, bear, ostrich, sea hawk, parrot, aviary mesh, gift shop. Grass, trees, and bushes turn green.
  - 3 stars: lion, snow leopard, hippo, anaconda, toucan, great horned owl, education center. Water turns blue.
  - 4 stars: elephant, rhino, polar bear, bald eagle. Paths, fences, and buildings get their colors.
  - 5 stars: aquarium tanks, sharks, orcas, dolphins, and water toys. Guests and staff get their colors.
  - 6 stars: ??? Animals in full color.
  - 7 stars: ???
  - 8 stars: ??? (the hardest of all: a near-perfect rating and a huge crowd)
  What stars 7 and 8 unlock stays hidden, in the game and in the Animals tab, until you earn them.
  Earned stars are never lost. Older saves work out their star level when loaded and keep everything already built.
- **Secrets**: a few rare animals are hidden until you find out how to unlock them.
- **Floors**: paint **snow** inside an exhibit for cold animals (penguins, snow leopards, polar bears want at least half the land snowy). Paint a **swim pool** inside an exhibit for animals that love the water (penguins, flamingos, bears, polar bears, elephants, hippos, rhinos, anacondas): they swim in it, and a pool of 3+ tiles counts as their water. Paint **tank water** (at least 12 tiles, inside a fence) for sharks, orcas, and dolphins. Fences beside tank water become glass walls.
- **Sharks, orcas, and dolphins** need lots of room in the tank, expensive food, and a keeper trained to skill 3. Orcas need another orca for company, and dolphins live in pods.
- **Aviaries**: birds that fly (sea hawk, parrot, toucan, owl, bald eagle) can only live in an exhibit closed in with **aviary mesh** all the way around. Paint mesh right over an existing fence to turn a pen into an aviary.
- **Sharing exhibits**: animals that share a habitat in the wild can live together, and enjoy it: the African savanna animals (zebra, giraffe, ostrich, rhino, elephant, hippo) and the rainforest birds (parrot, toucan). Everyone else lives only with their own kind.
- **Trees and toys**: oak, acacia, palm, and pine trees. Toys: a ball, an exercise wheel, a scratching post, a climbing frame (monkeys), a perch (birds), and three water toys for the tank: a floating buoy (orcas), a bubble curtain (sharks), and a floating hoop (dolphins). Any tree counts as a tree, but an animal that wants a toy wants its own kind (hover over it in the Animals tab to see which). Favorites make an animal a little happier.
- **Signature behaviors**: every species has its own move it does now and then. Lions roar, elephants spray water from their trunks, monkeys do backflips, penguins belly-slide, polar bears roll in the snow, parrots talk, dolphins leap and spin, and more.
- **Escapes**: if a fence comes down, animals get out and wander nearby. Keepers catch them and lead them to an exhibit they can live in.
- **Staff & training**: see everyone you've hired, what they're doing, and train them up to skill 5. Trained staff work faster (and keepers learn special skills), but each level costs more in training and wages.
- **Bottom bar**: four tabs. Build (paths, fences, floors, exhibit items, toys, buildings, remove), Animals, Staff, and Exhibits (every exhibit's happiness, space, company, food, and cleanliness at a glance, with what each one needs).
- **Guests** stop at the fence to watch the animals, and linger at their favorites, babies, and happy animals.
- **Paths** connect everything to the entrance. Guests only walk on paths.
- **Fences** make exhibits. An exhibit is grass that's fully closed in by fence, with a path running right beside it so keepers can get in.
- **Items**: tree, bush, water, and toy. Each species wants a few of these in its exhibit.
- **Color**: the zoo starts in black and white. Color arrives with the stars: plants at 2, water at 3, paths and buildings at 4, guests and staff at 5, and the animals at 6.
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

Controls: drag (or slide two fingers on a trackpad) to move around; pinch to zoom (with a mouse, hold Ctrl or ⌘ and scroll), or use the + and − buttons; space to pause; Esc to go back to the Look tool. Click anything with the Look tool to inspect it.

## Animal gallery

`approve.html` shows every animal walking and standing, with its baby, side-on and toward and away from the camera, in black and white or in color. (It includes the hidden animals, so it has spoilers.)

## Saving

- The game saves to the browser at the end of every in-game day, every 30 seconds, and when you close the tab.
- Saves stay on that device and browser.
- To move a zoo to another device, use **Menu → Export save file**, then **Import save file** on the other device.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The game page and its layout |
| `approve.html` | Animal gallery |
| `animals.js` | Animal art, walk cycles, colors, species data |
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

- **v1.9** (Oct 9, 2026)
  - Swim pools: a new floor to paint inside an exhibit. Penguins, flamingos, bears, polar bears, elephants, hippos, rhinos, and anacondas swim in it, sinking in up to their backs, and enjoy it. A pool of 3+ tiles counts as their water.
  - Exhibit signs are gone. The education part of the rating now comes from the education center.
  - New Exhibits tab in the bottom bar, with an overview panel: every exhibit's happiness, wants met, space, company, food, and cleanliness, plus a list of what each one needs. Click one to jump to it.
  - Star goals no longer include guests in one day, only guests in the zoo at once.
  - New toys: a perch for birds, a climbing frame for monkeys, and three water toys for the tank (floating buoy for orcas, bubble curtain for sharks, floating hoop for dolphins). Animals that want a toy now want a particular one: lions and bears a scratching post; snow leopards an exercise wheel; elephants, penguins, and polar bears a ball; monkeys a climbing frame; parrots a perch; and the tank animals their water toys.
  - Scratching posts are animated: the animal rears up against the post and rakes it, and bits of rope fly off.
  - Dolphins join the aquarium at 5 stars.
  - Every species has a signature behavior, with its own animation and effects.
  - Two new stars, 7 and 8, each with hidden animals. Star 8 needs a 97 rating and a very big crowd.
  - Animals after 5 stars stay out of the Animals tab and the star list until earned.
  - Color: guests and staff get their colors at 5 stars, and every animal at 6.
  - Keepers work better in big zoos: a messy exhibit can take a second or third keeper to help clean, idle keepers deal with even a single dropping, and they put food out a little sooner. Animals head to their food a little sooner too.
  - Animal art no longer needs approval to be used in the game. The approval sheet is now an animal gallery.
- **v1.8** (Oct 9, 2026)
  - The rating is now a scorecard of what makes a good zoo, instead of the mood of guests on their way out. Click the rating to see every part and its share:
    - Collection (36%): species variety 15%, headline animals 9%, collection size 7%, breeding success (babies born in the last 10 days) 5%.
    - Animal care (44%): habitat needs met 14%, space 9%, social groups 7%, nutrition 7%, clean exhibits 7%.
    - Guest experience (20%): clean paths 7%, ticket value 7%, education 6%.
  - The rating moves toward the score over about a day. A bigger, more varied zoo now scores higher instead of lower, and clean exhibits are judged by the share of exhibits that are clean, so more animals isn't a penalty in itself.
  - Variety draws guests. Each species adds a set amount, and each extra animal of a species you already have draws a little less than the one before.
  - Animals have social needs. Herd and flock animals want a group of their own kind (penguins and flamingos 6, zebras and monkeys 4, lions, elephants, giraffes and hippos 3, and so on). Solitary animals (bears, snow leopards, polar bears, owls, eagles, sea hawks, anacondas) get stressed with more than two adults together. Animal panels show a Company bar.
  - Ticket value: the price guests think is fair rises as the zoo gets better.
  - New exhibit sign ($50). Put it on an exhibit's fence where it runs beside a path. Signs and the education center make up the education score.
  - Fix: babies born overnight are now counted in each day's records.
- **v1.7** (Oct 9, 2026)
  - Janitors split the paths between them. Each one gets their own connected stretch of path, about the same size as everyone else's, and sweeps and patrols there. A janitor whose area is clean will go help in another area once litter has piled up there, and never heads for litter another janitor is already walking to. The areas are redrawn whenever you add or remove paths or hire or let go of a janitor.
  - Click a janitor to see their area shaded on the map.
- **v1.6** (Oct 8, 2026)
  - Guests visit with a plan instead of wandering. Each arrives hoping to see one animal in particular (popular animals more often), plus a few other exhibits (more in a bigger zoo). They visit them nearest-first, head for the least crowded spot along each fence, pick routes that avoid crowded paths where there's a choice, maybe stop at the gift shop or education center, then walk out. They walk a little faster too.
  - Guests say whether they got to see the animal they came for.
  - Saved zoos are re-checked against the current star goals when they load, and will be again whenever the goals change.
- **v1.5** (Oct 8, 2026)
  - Trackpad controls: sliding two fingers moves the map like grabbing it, and pinching zooms (including Safari's pinch gestures). With a mouse, hold Ctrl or ⌘ and scroll to zoom.
- **v1.4** (Oct 8, 2026)
  - Keepers can reach every exhibit: they walk across open grass, get through walls that are two or three fences thick (like doubled-up aviary mesh), get around tank water to land on the far side, and as a last resort cut through a neighboring exhibit. Keepers walking out or catching an escaped animal no longer block others from an exhibit, and food always goes where the animals can reach it.
  - Less crowding: each person walking around the zoo now stands for a pair of visitors, so the paths hold half as many figures. Visitor counts, ticket money, gift-shop sales, and star goals still count every visitor. New arrivals walk into the zoo before stopping to watch, and everyone walks a little faster.
- **v1.3** (Oct 8, 2026)
  - The news in the bottom-left corner can be minimized with its News button. While it's hidden, the button shows how many new messages have come in. The full news list is still in the Menu.
- **v1.2** (Oct 8, 2026)
  - Fixed crowding: visits are shorter and grow with the number of exhibits, guests spread across the path width, avoid packed spots, and no more than four watch from the same spot. Guests head home once they've seen everything.
  - Fixed the rating always sitting above 90: litter and dirty exhibits now really bother guests, and a great collection of animals can't hide a messy zoo.
  - Star goals retuned to the new guest numbers.
  - A sixth star, for the most dedicated zookeepers. Some say it leads to something rare.
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
