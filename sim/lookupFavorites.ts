import { players } from '../src/data/players';
import { computeTwoQbRankings } from '../src/data/twoQbAdjustment';

const requested: Record<string, string[]> = {
  QB: ['Josh Allen', 'Drake Maye', 'Caleb Williams', 'Justin Herbert', 'Trevor Lawrence', 'Dak Prescott', 'Brock Purdy', 'Patrick Mahomes', 'Kyler Murray', 'Matthew Stafford', 'Sam Darnold'],
  RB: ['Bijan Robinson', 'Jahmyr Gibbs', 'Christian McCaffrey', 'James Cook III', 'Ashton Jeanty', 'Kenneth Walker III', 'Derrick Henry', 'Chase Brown', 'Omarion Hampton', 'Javonte Williams', 'Cam Skattebo', "D'Andre Swift", 'David Montgomery', 'Bhayshul Tuten', 'Jaylen Warren', 'Rico Dowdle', 'Kyle Monangai', 'Blake Corum', 'Kenny Gainwell', 'Jonathon Brooks'],
  WR: ['Puka Nacua', "Ja'Marr Chase", 'Jaxon Smith-Njigba', 'Amon-Ra St. Brown', 'Justin Jefferson', 'A.J. Brown', 'George Pickens', 'Rashee Rice', 'DeVonta Smith', 'Zay Flowers', 'Ladd McConkey', 'Jaylen Waddle', 'Davante Adams', 'Malik Nabers', 'Luther Burden III', 'Mike Evans', 'Christian Watson', 'Parker Washington', 'Courtland Sutton', 'Quentin Johnston', 'Josh Downs', 'Jayden Reed', "Wan'Dale Robinson", 'Rashid Shaheed'],
  TE: ['Tucker Kraft', 'George Kittle', 'Dallas Goedert', 'Isaiah Likely'],
};

const ranked = computeTwoQbRankings(players);
const byName = new Map(ranked.map((p) => [p.name, p]));

for (const [pos, names] of Object.entries(requested)) {
  console.log(`\n=== ${pos} ===`);
  const rows = names.map((n) => {
    const p = byName.get(n);
    if (!p) return { name: n, found: false };
    return { name: n, rank: p.twoQbRank, espnRank: p.espnRank, found: true };
  });
  rows.sort((a: any, b: any) => (a.rank ?? 9999) - (b.rank ?? 9999));
  for (const r of rows as any[]) {
    if (!r.found) console.log(`  ??? NOT FOUND: ${r.name}`);
    else console.log(`  2QB rank ${String(r.rank).padStart(3)} (espn ${r.espnRank}) - ${r.name}`);
  }
}
