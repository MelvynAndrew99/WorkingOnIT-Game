"""Create a disposable local FLOW playtest; never modify runtime source or player saves."""
from pathlib import Path
import shutil
import tempfile

root = Path(__file__).resolve().parents[3]
target = Path(tempfile.mkdtemp(prefix="flow03-playtest-"))
for name in ["src", "public"]:
    shutil.copytree(root / name, target / name)
for name in ["package.json", "index.html", "tsconfig.json", "vite.config.ts", "game.config.json"]:
    if (root / name).exists():
        shutil.copy2(root / name, target / name)
(target / "node_modules").symlink_to(root / "node_modules", target_is_directory=True)

# No RUN initialization, storage, analytics or lifecycle writes in the disposable copy.
(target / "src/sdk/runSdk.ts").write_text('''
export const sdkReady = () => false;
export const initSdk = async () => false;
export const registerLifecycles = (_callbacks: unknown) => ({unsubscribeAll() {}});
''')
(target / "src/state/save.ts").write_text('''
import {parseCity, stepCity, place, type City} from '../game/cityModel.ts';
import {connectExternalCity} from '../game/cityExternal.ts';
import {flowTown} from '../game/fixtures/flowTown.ts';
const trial = new URLSearchParams(location.search).get('trial') === '2' ? '2' : '1';
const KEY = 'working-on-it:flow03-playtest:v1:' + trial;
export interface SaveData {city: City; updatedAt: number}
function fresh(): City {
  const city = flowTown();
  stepCity(city, 120);
  city.tutorial.status = 'complete';
  city.missions.completed = ['open-for-business','word-on-the-street','a-reason-to-drive','a-town-to-notice','everyone-connected'];
  city.missions.claimed = ['open-for-business','word-on-the-street','a-reason-to-drive','a-town-to-notice'];
  // Fixture-only outside consent on an isolated edge tile: no outside demand unless
  // the tester deliberately joins it. This lets the real civic objective take precedence.
  place(city, 'road', city.map.x + city.map.width - 1, city.map.y + city.map.height - 1);
  connectExternalCity(city, {x: city.map.x + city.map.width - 1, y: city.map.y + city.map.height - 1});
  return city;
}
let data: SaveData;
export async function loadSave(): Promise<SaveData> {
  let city: City | null = null;
  try {city = parseCity(JSON.parse(localStorage.getItem(KEY) ?? 'null')?.city);} catch {}
  data = {city: city ?? fresh(), updatedAt: 0};
  return data;
}
export const getSave = () => data;
export function flushSave() {
  data.updatedAt = Date.now();
  try {localStorage.setItem(KEY, JSON.stringify(data));} catch {}
}
export function startNewCity() {data = {city: fresh(), updatedAt: Date.now()}; flushSave();}
''')
# Make the disposable context clear without adding a production feature or hinting a solution.
menu = target / "src/ui/MainMenu.tsx"
text = menu.read_text().replace('A better commute starts here.', 'Disposable FLOW playtest · Trial {new URLSearchParams(location.search).get("trial") === "2" ? "2" : "1"}')
text = text.replace('This replaces your current town. Your existing roads, buildings, and funds will be reset.', 'This restarts only this disposable playtest trial. Your normal town is untouched.')
menu.write_text(text)
print(target)
