// The draft between waves: clear a wave, choose one of three boons. Each boon
// names what it does in one line, stacks when drawn again, and caps where a cap
// keeps the game fair. The draft is the game's long-term choice: damage now, or
// speed and survival for the waves ahead.
export const UPGRADES = [
  {
    id: 'ember-rounds', name: 'Ember Rounds', icon: '✦',
    text: '+25% bullet damage',
    apply: (player) => { player.weapon.damage *= 1.25; },
  },
  {
    id: 'swift-trigger', name: 'Swift Trigger', icon: '≫',
    text: '+20% fire rate',
    apply: (player) => { player.weapon.fireInterval = Math.max(0.08, player.weapon.fireInterval * 0.83); },
  },
  {
    id: 'twin-flame', name: 'Twin Flame', icon: '❖',
    text: '+1 bolt per shot (max 5)',
    apply: (player) => { player.weapon.shots = Math.min(5, player.weapon.shots + 1); },
  },
  {
    id: 'piercing-light', name: 'Piercing Light', icon: '➶',
    text: 'Bolts pierce +1 enemy (max 3)',
    apply: (player) => { player.weapon.pierce = Math.min(3, player.weapon.pierce + 1); },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', icon: '➤',
    text: '+12% move speed',
    apply: (player) => { player.speed *= 1.12; },
  },
  {
    id: 'lantern-heart', name: 'Lantern Heart', icon: '♥',
    text: '+25 max health and heal 25',
    apply: (player) => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); },
  },
  {
    id: 'ember-magnet', name: 'Ember Magnet', icon: '◎',
    text: '+60% ember pickup range',
    apply: (player) => { player.pickupRadius *= 1.6; },
  },
  {
    id: 'quick-dash', name: 'Quick Dash', icon: '↯',
    text: 'Dash recharges 30% faster',
    apply: (player) => { player.dashCooldownMax = Math.max(1.0, player.dashCooldownMax * 0.7); },
  },
  {
    id: 'overcharge', name: 'Overcharge', icon: '★',
    text: '+15% damage, +10% fire rate',
    apply: (player) => {
      player.weapon.damage *= 1.15;
      player.weapon.fireInterval = Math.max(0.08, player.weapon.fireInterval * 0.91);
    },
  },
];

/** Draw three distinct boons, weighted away from ones already taken often. */
export function drawDraft(random, taken) {
  const pool = UPGRADES.filter((upgrade) => (taken[upgrade.id] ?? 0) < 3);
  const choices = [];
  const bag = [...pool];
  while (choices.length < 3 && bag.length > 0) {
    const index = Math.floor(random() * bag.length);
    choices.push(bag.splice(index, 1)[0]);
  }
  return choices;
}
