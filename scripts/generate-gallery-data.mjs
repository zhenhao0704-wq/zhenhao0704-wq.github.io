import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDirectory = path.join(root, "img");
const derivativeManifest = JSON.parse(
  await readFile(path.join(imageDirectory, "image-derivatives.json"), "utf8"),
);

const qatarItems = [
  ["qatar-national-museum-passage.jpg", "Passage through the desert-rose forms of the National Museum of Qatar."],
  ["qatar-katara-shade-sails.jpg", "Shade sails above a passage in Katara Cultural Village."],
  ["qatar-museum-of-islamic-art.jpg", "Museum of Islamic Art on the Doha waterfront."],
  ["qatar-national-museum-curves.jpg", "Overlapping architectural curves at the National Museum of Qatar."],
  ["qatar-place-vendome-hands.jpg", "Hands sculpture at Place Vendome in Lusail."],
  ["qatar-pastel-street-stop.jpg", "Pastel buildings and a stop sign in Qatar."],
  ["qatar-national-museum-facade-wide.jpg", "Wide view of the National Museum of Qatar facade."],
  ["qatar-katara-door-06.jpg", "Numbered wooden door in Katara Cultural Village."],
  ["qatar-geometric-skylight.jpg", "Geometric skylight casting patterned light."],
  ["qatar-palms-through-museum.jpg", "Palm trees framed by the National Museum of Qatar."],
  ["qatar-katara-sails-lane.jpg", "Sail-covered lane in Katara Cultural Village."],
  ["qatar-national-museum-sculpture.jpg", "Outdoor sculpture at the National Museum of Qatar."],
  ["qatar-pink-buildings-wide.jpg", "Wide view of pink buildings in Qatar."],
  ["qatar-pink-courtyard-plants.jpg", "Hanging plants in a pink courtyard."],
  ["qatar-national-museum-city-frame.jpg", "Doha buildings framed by the National Museum of Qatar."],
  ["qatar-blue-pots-calligraphy.jpg", "Blue pots beside an Arabic calligraphy wall."],
  ["qatar-pink-door.jpg", "Wooden door set in a pink wall."],
  ["qatar-stained-glass-hall.jpg", "Colourful stained-glass hall in Qatar."],
  ["qatar-courtyard-arches.jpg", "Repeated arches around a quiet courtyard."],
  ["qatar-katara-lantern-wall.jpg", "Lanterns mounted on a wall in Katara Cultural Village."],
  ["qatar-black-door-13.jpg", "Black numbered door in Qatar."],
  ["qatar-palm-walls.jpg", "Palm tree between pale architectural walls."],
  ["qatar-katara-horse-mural.jpg", "Horse mural in Katara Cultural Village."],
  ["qatar-bougainvillea-window.jpg", "Bougainvillea beside a shaded window."],
  ["qatar-evening-building-frame.jpg", "Evening building framed by shade cloth."],
  ["qatar-red-bougainvillea-arch.jpg", "Red bougainvillea beside an archway."],
  ["qatar-national-museum-wide.jpg", "Desert-rose architecture of the National Museum of Qatar."],
];

const czechItems = [
  ["czech-08-red-walled-passage.jpg", "A silhouetted person crossing a red-walled passage."],
  ["czech-04-dark-restaurant-window.jpg", "Empty restaurant tables beside a bright window in a dark interior."],
  ["czech-05-red-white-tram.jpg", "Red-and-white city tram beneath a blue, cloud-filled sky."],
  ["czech-07-passengers-through-tram-window.jpg", "Passengers seen through the window of a red-and-white tram."],
  ["czech-03-cobbled-street-cafe.jpg", "People seated at outdoor cafe tables on a cobbled street."],
  ["czech-24-window-framed-architecture.jpg", "Sunlit stone architecture framed by dark window mullions."],
  ["czech-11-sculpture-stained-glass.jpg", "Stone sculpture beside a stained-glass window inside a cathedral."],
  ["czech-14-statue-stained-glass.jpg", "A dark religious statue silhouetted against stained glass."],
  ["czech-16-statue-gilded-screen.jpg", "Stone statue and gilded screen lit by sunlight inside a cathedral."],
  ["czech-17-bronze-figure-stained-glass.jpg", "Bronze praying figure beside tall stained-glass windows."],
  ["czech-18-stained-glass-from-below.jpg", "Stained-glass windows and Gothic stonework seen from below."],
  ["czech-10-visitors-cathedral-nave.jpg", "Visitors standing in a dim cathedral nave beside tall windows."],
  ["czech-21-organ-pipes-circular-window.jpg", "Silver organ pipes framed by a circular stained-glass window."],
  ["czech-15-blue-gold-religious-mural.jpg", "Blue-and-gold religious mural depicting a crowned figure."],
  ["czech-09-gothic-cathedral-exterior.jpg", "Gothic cathedral exterior under a deep blue sky."],
  ["czech-25-church-courtyard.jpg", "Historic church buildings around a crowded sunlit courtyard."],
  ["czech-28-crowded-pastel-street.jpg", "Crowds walking along a narrow street between pastel buildings."],
  ["czech-30-red-tiled-rooftops.jpg", "Red tiled rooftops across the historic city center."],
  ["czech-32-prague-skyline-bridge.jpg", "Prague skyline and bridge seen across red rooftops and trees."],
  ["czech-01-prague-castle-riverside.jpg", "Prague Castle and riverside buildings under a cloudy sky."],
  ["czech-02-historic-street-tram-wires.jpg", "Sunlit street lined with historic buildings and tram wires."],
  ["czech-29-quiet-cobbled-courtyard.jpg", "Parked cars in a quiet cobbled courtyard between pale buildings."],
  ["czech-06-passengers-inside-tram.jpg", "Passengers seated inside a city tram beside sunlit doors."],
  ["czech-12-gothic-windows-interior.jpg", "Gothic windows and carved details in a dim cathedral interior."],
  ["czech-13-angels-gilded-crest.jpg", "Sculpted angels gathered around a gilded crest inside a cathedral."],
  ["czech-19-large-stained-glass-window.jpg", "Large stained-glass window framed by Gothic stone arches."],
  ["czech-20-organ-circular-window.jpg", "Cathedral organ beneath a circular stained-glass window."],
  ["czech-22-windows-scaffolding.jpg", "Tall stained-glass windows and scaffolding inside a cathedral."],
  ["czech-23-shadowed-gothic-arches.jpg", "Shadowed Gothic arches and windows inside a cathedral."],
  ["czech-26-diners-sunlit-courtyard.jpg", "Diners in a sunlit courtyard outside a restaurant."],
  ["czech-27-cafe-fountain.jpg", "Outdoor cafe tables around a small circular fountain."],
  ["czech-31-rooftops-church-towers.jpg", "Historic rooftops and church towers beside a green hillside."],
];

const austriaItems = [
  ["austria-01-museum-grand-staircase.jpg", "Grand marble staircase and sculpture hall inside Vienna's Kunsthistorisches Museum."],
  ["austria-02-bronze-male-statue.jpg", "Bronze male statue lit from behind in a Vienna museum gallery."],
  ["austria-03-marble-head-sculpture.jpg", "Classical marble head displayed among sculptures in a Vienna museum."],
  ["austria-04-illuminated-gothic-spires.jpg", "Illuminated twin Gothic spires against the night sky in Vienna."],
  ["austria-05-chapel-nave-altar.jpg", "Chapel nave leading to a gilded altar beneath a religious painting."],
  ["austria-06-crowned-madonna-and-child.jpg", "Crowned Madonna and child statue framed by gold rays."],
  ["austria-07-baroque-main-altar.jpg", "Baroque main altar with marble columns, white figures, and gold rays."],
  ["austria-08-dome-fresco-close.jpg", "Close upward view of a Baroque dome fresco surrounding an oval opening."],
  ["austria-09-dome-fresco-wide.jpg", "Wide upward view of a painted Baroque dome and its windows."],
  ["austria-10-medusa-painting.jpg", "Framed painting of Medusa surrounded by snakes."],
  ["austria-11-renaissance-portrait-pair.jpg", "Paired Renaissance portraits of a man and woman in richly coloured dress."],
  ["austria-12-garden-hedge-path.jpg", "Sunlit path between tall green hedges in an Austrian garden."],
  ["austria-13-baroque-altar-wide.jpg", "Wide view of a monumental Baroque altar beneath gold rays."],
  ["austria-14-radiant-altar-detail.jpg", "White Baroque figures beneath a radiant triangle above the altar."],
  ["austria-15-side-altar-painting.jpg", "Ornate side altar with a tall religious painting and marble columns."],
  ["austria-16-architectural-painting.jpg", "Framed architectural painting of an elaborate European courtyard."],
  ["austria-17-church-visitor-aisle.jpg", "Visitor silhouetted in the aisle before an illuminated Baroque altar."],
  ["austria-18-floral-still-life.jpg", "Framed still life of tulips, roses, fruit, and small insects."],
  ["austria-19-museum-exhibition-hall.jpg", "Ornate museum hall with marble columns and Canaletto and Bellotto exhibition displays."],
];

const turkeyItems = [
  ["turkey-01-blue-mosque-rooftops.jpg", "The Blue Mosque beyond domes and a minaret in Istanbul."],
  ["turkey-02-blue-mosque-clouds.jpg", "The Blue Mosque and surrounding domes beneath a cloud-filled sky."],
  ["turkey-03-blue-mosque-six-minarets.jpg", "The Blue Mosque framed by its six minarets in Istanbul."],
  ["turkey-04-man-child-waterfront.jpg", "A man and child sitting beside the blue water on Istanbul's waterfront."],
  ["turkey-05-flags-blue-sky.jpg", "Turkish and Istanbul maritime flags flying against a deep blue sky."],
  ["turkey-06-mosque-dome-sea.jpg", "Mosque dome above trees with the Sea of Marmara and islands beyond."],
  ["turkey-07-galata-tower-skyline.jpg", "Galata Tower rising above Istanbul's dense hillside buildings."],
  ["turkey-08-ferry-cruise-ship.jpg", "A small Istanbul ferry crossing in front of a large cruise ship."],
  ["turkey-09-blue-mosque-sea.jpg", "The Blue Mosque and a foreground dome overlooking the Sea of Marmara."],
  ["turkey-10-waterfront-fishermen.jpg", "Fishermen gathering with rods and chairs on Istanbul's waterfront."],
];

const galleries = [
  ["friends", "Friends", "Production photography from Kobo Abe's Friends (1967).", "friends-"],
  ["glass", "Great Glass Elevator", "Production photography from Mark Branner's adaptation of Roald Dahl's Charlie and the Great Glass Elevator (2026).", "glass-"],
  ["france", "France", "Travel photographs from France.", "france-"],
  ["italy", "Italy", "Travel photographs from Italy.", "italy-"],
  ["uk", "United Kingdom", "Travel photographs from the United Kingdom.", "uk-"],
  ["japan", "Japan", "Travel photographs from Japan.", "japan-"],
  ["spain", "Spain", "Travel photographs from Spain.", "spain-"],
  ["iceland", "Iceland", "Travel photographs from Iceland.", "iceland-"],
  ["switzerland", "Switzerland", "Travel photographs from Switzerland.", "switzerland-"],
  ["us", "United States", "Travel photographs from the United States.", "us-"],
  ["thailand", "Thailand", "Travel photographs from Thailand.", "thailand-"],
  ["nepal", "Nepal", "Travel photographs from Nepal.", "nepal-"],
  ["egypt", "Egypt", "Travel photographs from Egypt.", "egypt-"],
  ["indonesia", "Indonesia", "Travel photographs from Indonesia.", "indonesia-"],
  ["malaysia", "Malaysia", "Travel photographs from Malaysia.", "malaysia-"],
  ["china", "China", "Travel photographs from China.", "china-"],
  ["vietnam", "Vietnam", "Travel photographs from Vietnam.", "vietnam-"],
  ["korea", "South Korea", "Travel photographs from South Korea.", "korea-"],
  ["qatar", "Qatar", "Travel photographs from Doha and Lusail, Qatar.", "qatar-", qatarItems],
  ["czech", "Czech Republic", "Travel photographs from Prague, Czech Republic.", "czech-", czechItems],
  ["austria", "Austria", "Travel photographs from Vienna, Austria.", "austria-", austriaItems],
  ["turkey", "Turkey", "Travel photographs from Istanbul, Turkey.", "turkey-", turkeyItems],
];

const files = (await readdir(imageDirectory)).sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true }),
);

function labelFromFilename(filename, prefix) {
  return filename
    .slice(prefix.length)
    .replace(/\.[^.]+$/, "")
    .replace(/\b(bw|abc|kl|ngo|mon)\b/gi, (value) => value.toUpperCase())
    .split("-")
    .filter(Boolean)
    .join(" ");
}

const output = Object.fromEntries(
  galleries.map(([key, title, description, prefix, manifest]) => {
    const items = manifest
      ? manifest.map(([filename, alt]) => ({ filename, alt }))
      : files
        .filter((filename) => filename.startsWith(prefix))
        .map((filename) => ({
          filename,
          alt: `${title}: ${labelFromFilename(filename, prefix)}`,
        }));

    const optimizedItems = items.map(({ filename, alt }) => {
      const derivative = derivativeManifest[filename];
      if (!derivative) throw new Error(`Missing derivative metadata for ${filename}`);
      return {
        src: derivative.large,
        thumb: derivative.small,
        width: derivative.width,
        height: derivative.height,
        alt,
      };
    });

    return [key, { title, description, items: optimizedItems }];
  }),
);

const source = `// Generated by scripts/generate-gallery-data.mjs.\nwindow.PORTFOLIO_GALLERIES = ${JSON.stringify(output, null, 2)};\n`;
await writeFile(path.join(root, "gallery-data.js"), source);

console.log(
  `Generated ${Object.keys(output).length} galleries with ${Object.values(output).reduce((sum, gallery) => sum + gallery.items.length, 0)} images.`,
);
