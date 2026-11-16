/* fixtures.js — deterministic EXAMPLE network data for the prototype (not real relay data). */
(function () {
  var seed = 1723;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  function hexid(n) { var s = ""; for (var i = 0; i < (n || 64); i++) s += "0123456789abcdef"[Math.floor(rnd() * 16)]; return s; }
  var CHAINS = {
    bitcoin: { name: "Bitcoin", alg: "sha256d-aux", genesis: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f" },
    litecoin: { name: "Litecoin", alg: "scrypt-aux", genesis: "12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2" },
    dogecoin: { name: "Dogecoin", alg: "scrypt-aux", genesis: "1a91e3dace36e2be3bf030a65679fe821aa1d6ef92e7c9902eb318182c355691" },
    flokicoin: { name: "Flokicoin", alg: "scrypt-aux", genesis: hexid() },
    bellscoin: { name: "Bellscoin", alg: "scrypt-aux", genesis: hexid() }
  };
  var PROVIDERS = [
    { name: "Northfield Rigs", id: hexid(), alg: "sha256d", maxZ: "40z00", max: 500, price: { amount: 1, unit: "sat", z: "24z00" }, horizon: 3600, live: true, note: "S21 farm, hydro" },
    { name: "Kestrel Hash", id: hexid(), alg: "sha256d", maxZ: "36z00", max: 2000, price: { amount: 2, unit: "sat", z: "26z00" }, horizon: 900, live: true, note: "Fast turnaround" },
    { name: "Lantern Mining Co.", id: hexid(), alg: "scrypt", maxZ: "30z00", max: 800, price: { amount: 1, unit: "sat", z: "20z00" }, horizon: 7200, live: true, note: "L9 fleet" },
    { name: "Ostrich Works", id: hexid(), alg: "scrypt", maxZ: "28z50", max: 300, price: { amount: 3, unit: "sat", z: "22z00" }, horizon: 1800, live: false, note: "Paused for maintenance" },
    { name: "Fjord Compute", id: hexid(), alg: "sha256d", maxZ: "44z00", max: 100, price: { amount: 5, unit: "sat", z: "30z00" }, horizon: 86400, live: true, note: "Large notes only" }
  ];
  var NSPS = [
    { name: "Ironbark NSP", id: hexid(), chain: "flokicoin", url: "grpcs://nsp.ironbark.example:443", fee: 5000 },
    { name: "Ironbark NSP", id: hexid(), chain: "litecoin", url: "grpcs://nsp.ironbark.example:443", fee: 5000 },
    { name: "Tidewater Nodes", id: hexid(), chain: "dogecoin", url: "grpcs://tidewater.example:7443", fee: 2500 },
    { name: "Tidewater Nodes", id: hexid(), chain: "bellscoin", url: "grpcs://tidewater.example:7443", fee: 2500 },
    { name: "Solo Harbor", id: hexid(), chain: "bitcoin", url: "grpcs://harbor.example:443", fee: 0 }
  ];
  var PAYS = [
    { who: "Alice", id: hexid(), d: "lightning", method: "lightning", dest: "alice@wallet.example", min: 1 },
    { who: "Alice", id: hexid(), d: "flokicoin", method: "onchain", dest: "F" + hexid(33), min: 100000 },
    { who: "Bob", id: hexid(), d: "lightning", method: "lightning", dest: "bob@pay.example", min: 10 },
    { who: "Carol", id: hexid(), d: "litecoin", method: "onchain", dest: "ltc1q" + hexid(38), min: 50000 }
  ];
  var ALGS = ["sha256d", "sha256d-aux", "scrypt-aux", "scrypt"];
  var BINDS = ["unbound", "reaction", "access epoch", "offer", "unbound", "offer"];
  var NOTES = [];
  for (var i = 0; i < 40; i++) {
    var alg = ALGS[Math.floor(rnd() * ALGS.length)];
    var z = alg.indexOf("aux") > 0 ? 28 + Math.floor(rnd() * 16) : 12 + Math.floor(rnd() * 16);
    NOTES.push({ alg: alg, zbit: z + "z" + String(Math.floor(rnd() * 100)).padStart(2, "0"), id: hexid(), bind: BINDS[Math.floor(rnd() * BINDS.length)], H: hexid(), ago: Math.floor(rnd() * 600), ok: rnd() > .04 });
  }
  NOTES.sort(function (a, b) { return a.ago - b.ago; });
  var RELAYS = [
    { url: "wss://relay.sharenote.example", gate: true, state: "connected" },
    { url: "wss://pow.nostr.example", gate: true, state: "connected" },
    { url: "wss://relay.damus.example", gate: false, state: "connecting" },
    { url: "wss://nos.example", gate: false, state: "error" }
  ];
  window.SN_FIX = { CHAINS: CHAINS, PROVIDERS: PROVIDERS, NSPS: NSPS, PAYS: PAYS, NOTES: NOTES, RELAYS: RELAYS, hexid: hexid,
    G: "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798" };
})();
