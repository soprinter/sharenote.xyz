/* zmath.js — SNP-01 arithmetic + SN4U record, ported from @soprinter/sharenotejs 5.6 (snp01/arith.ts, record.ts),
 * snp02 estimateHashrate, snp06 cost cap. Exact BigInt only. Browser global `SN`; Node module.exports. */
var SN = (function () {
  "use strict";
  var SCALE = [
    281474976710656n, 279530687024667n, 277599827528556n, 275682305453224n, 273778028670377n,
    271886905688097n, 270008845646447n, 268143758313103n, 266291554079025n, 264452143954145n,
    262625439563097n, 260811353140964n, 259009797529070n, 257220686170786n, 255443933107372n,
    253679452973851n, 251927160994904n, 250186972980797n, 248458805323338n, 246742574991859n,
    245038199529225n, 243345597047876n, 241664686225891n, 239995386303078n, 238337617077099n,
    236691298899613n, 235056352672450n, 233432699843812n, 231820262404496n, 230218962884149n,
    228628724347546n, 227049470390891n, 225481125138147n, 223923613237393n, 222376859857200n,
    220840790683039n, 219315331913707n, 217800410257785n, 216295952930114n, 214801887648299n,
    213318142629235n, 211844646585660n, 210381328722730n, 208928118734616n, 207484946801125n,
    206051743584350n, 204628440225334n, 203214968340765n, 201811260019689n, 200417247820245n,
    199032864766430n, 197658044344876n, 196292720501658n, 194936827639116n, 193590300612709n,
    192253074727881n, 190925085736954n, 189606269836042n, 188296563661983n, 186995904289297n,
    185704229227163n, 184421476416415n, 183147584226560n, 181882491452819n, 180626137313186n,
    179378461445504n, 178139403904572n, 176908905159257n, 175686906089641n, 174473347984174n,
    173268172536857n, 172071321844442n, 170882738403647n, 169702365108392n, 168530145247060n,
    167366022499769n, 166209940935666n, 165061845010243n, 163921679562664n, 162789389813116n,
    161664921360180n, 160548220178213n, 159439232614756n, 158337905387954n, 157244185583997n,
    156158020654576n, 155079358414361n, 154008147038492n, 152944335060090n, 151887871367783n,
    150838705203251n, 149796786158788n, 148762064174879n, 147734489537795n, 146714012877205n,
    145700585163805n, 144694157706960n, 143694682152365n, 142702110479724n, 141716395000440n
  ];
  var TWO_256 = 1n << 256n, TWO_384 = 1n << 384n, MAX_READBACK_Z = 247;

  function isZBit(zb) { return zb && Number.isInteger(zb.z) && Number.isInteger(zb.cc) && zb.z >= 1 && zb.z <= 255 && zb.cc >= 0 && zb.cc <= 99; }
  function parseZBit(s) {
    var m = /^([1-9][0-9]{0,2})z([0-9]{2})$/.exec(String(s).trim());
    if (!m) return undefined;
    var zb = { z: Number(m[1]), cc: Number(m[2]) };
    return isZBit(zb) ? zb : undefined;
  }
  function formatZBit(zb) { return zb.z + "z" + String(zb.cc).padStart(2, "0"); }
  function target(zb) { if (!isZBit(zb)) throw new RangeError("not a Z-bit"); return ((1n << BigInt(256 - zb.z)) * SCALE[zb.cc]) >> 48n; }
  function weight(zb) { return TWO_384 / target(zb); }
  function bitLength(v) { return v.toString(2).length; }
  function zbitOfTarget(t) {
    if (t < 1n) throw new RangeError("target must be at least 1");
    var z = 256 - bitLength(t) + ((t & (t - 1n)) === 0n ? 1 : 0);
    if (z < 1 || z > MAX_READBACK_Z) throw new RangeError("target out of read-back range");
    for (var cc = 99; cc >= 0; cc--) if (target({ z: z, cc: cc }) >= t) return { z: z, cc: cc };
    throw new RangeError("no Z-bit");
  }
  function zbitOfWeight(w) { return zbitOfTarget(TWO_384 / w); }
  function addZBits(list) { var s = 0n; list.forEach(function (zb) { s += weight(zb); }); return zbitOfWeight(s); }
  /** recipients: [{weight, minH}] → shares (BigInt[]) in input order */
  function split(reward, recipients) {
    var W = recipients.reduce(function (a, r) { return a + r.weight; }, 0n);
    var shares = recipients.map(function (r) { return (reward * r.weight) / W; });
    var rems = recipients.map(function (r) { return (reward * r.weight) % W; });
    var left = reward - shares.reduce(function (a, b) { return a + b; }, 0n);
    var order = recipients.map(function (_, i) { return i; }).sort(function (a, b) {
      if (rems[a] !== rems[b]) return rems[a] > rems[b] ? -1 : 1;
      var ha = recipients[a].minH, hb = recipients[b].minH;
      if (ha !== hb) return ha < hb ? -1 : 1;
      return a - b;
    });
    for (var k = 0n; k < left; k++) shares[order[Number(k)]] += 1n;
    return shares;
  }
  /** expected hashes D = 2^256 / T (BigInt) */
  function value(zb) { return TWO_256 / target(zb); }
  /** D as a float (log-safe) */
  function valueFloat(zb) { return Math.pow(2, zb.z) * Math.pow(2, 48) / Number(SCALE[zb.cc]); }
  /** Z-bit as a real number (z + cc/100) */
  function zReal(zb) { return zb.z + zb.cc / 100; }
  /** the Z-bit whose D is closest below a float hash count */
  function zbitForHashes(d) {
    if (!(d >= 2)) return { z: 1, cc: 0 };
    var x = Math.log2(d), z = Math.floor(x), cc = Math.floor((x - z) * 100 + 1e-9);
    if (z < 1) return { z: 1, cc: 0 };
    if (z > 255) return { z: 255, cc: 99 };
    return { z: z, cc: Math.min(99, cc) };
  }
  /** SNP-06 cost cap: ceil(amount·count·w(z)/w(pz)) */
  function costCap(amount, count, zb, priceZb) {
    var num = BigInt(amount) * BigInt(count) * weight(zb), den = weight(priceZb);
    return (num + den - 1n) / den;
  }
  /** SNP-02 estimate: Σ D_i / t (float, H/s) */
  function estimateHashrate(zbits, seconds) {
    var s = 0n; zbits.forEach(function (zb) { s += weight(zb); });
    var q = (s << 52n) / (1n << 128n);
    return Number(q) / Math.pow(2, 52) / seconds;
  }

  /* ---------- bytes ---------- */
  function hex(b) { var s = ""; for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? "0" : "") + b[i].toString(16); return s; }
  function unhex(s) { s = s.replace(/[^0-9a-f]/gi, ""); var o = new Uint8Array(s.length >> 1); for (var i = 0; i < o.length; i++) o[i] = parseInt(s.substr(i * 2, 2), 16); return o; }
  function concat(arrs) { var n = 0; arrs.forEach(function (a) { n += a.length; }); var o = new Uint8Array(n), p = 0; arrs.forEach(function (a) { o.set(a, p); p += a.length; }); return o; }
  function u16(n) { return Uint8Array.of((n >> 8) & 255, n & 255); }
  function utf8(s) { return new TextEncoder().encode(s); }
  function big(b) { var v = 0n; for (var i = 0; i < b.length; i++) v = (v << 8n) | BigInt(b[i]); return v; }
  function hex64(v) { return v.toString(16).padStart(64, "0"); }

  /* ---------- SHA-256 (sync, compact) ---------- */
  var K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  var Wb = new Uint32Array(64);
  function sha256(msg) {
    var l = msg.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(msg); m[l] = 0x80;
    var bits = l * 8; m[nb - 4] = (bits >>> 24) & 255; m[nb - 3] = (bits >>> 16) & 255; m[nb - 2] = (bits >>> 8) & 255; m[nb - 1] = bits & 255;
    m[nb - 5] = Math.floor(bits / 4294967296) & 255;
    var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (var o = 0; o < nb; o += 64) {
      for (var i = 0; i < 16; i++) Wb[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (i = 16; i < 64; i++) {
        var x = Wb[i - 15], y = Wb[i - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        Wb[i] = (Wb[i - 16] + s0 + Wb[i - 7] + s1) | 0;
      }
      var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + Wb[i]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    var out = new Uint8Array(32), hs = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (i = 0; i < 8; i++) { out[i * 4] = hs[i] >>> 24; out[i * 4 + 1] = (hs[i] >>> 16) & 255; out[i * 4 + 2] = (hs[i] >>> 8) & 255; out[i * 4 + 3] = hs[i] & 255; }
    return out;
  }
  function sha256d(b) { return sha256(sha256(b)); }

  /* ---------- SN4U record ---------- */
  var TAG = Uint8Array.of(0x53, 0x4e, 0x34, 0x55);
  function encodeRecord(f) {
    var a = utf8(f.algorithm);
    return concat([TAG, Uint8Array.of(1), u16(a.length), a, f.identity, Uint8Array.of(f.zbit.z, f.zbit.cc), u16(f.binding.length), f.binding, u16(f.nonce.length), f.nonce]);
  }
  /** byte spans for the inspector: [{name, from, to}] */
  function recordSpans(rec) {
    var spans = [], i = 0;
    function push(name, n) { spans.push({ name: name, from: i, to: i + n }); i += n; }
    push("tag", 4); push("version", 1);
    var al = (rec[i] << 8) | rec[i + 1]; push("alg-len", 2); push("algorithm", al);
    push("identity", 32); push("z", 1); push("cc", 1);
    var bl = (rec[i] << 8) | rec[i + 1]; push("bind-len", 2); push("binding", bl);
    var nl = (rec[i] << 8) | rec[i + 1]; push("nonce-len", 2); push("nonce", nl);
    return spans;
  }
  var KNOWN = { sha256d: true, scrypt: true, "sha256d-aux": true, "scrypt-aux": true };
  /** checks 1–5 for sha256d (curve check on identity omitted in the prototype) */
  function verifyRecord(rec) {
    function r(verdict, check, reason, extra) { return Object.assign({ verdict: verdict, check: check, reason: reason }, extra || {}); }
    if (rec.length < 5 || TAG.some(function (b, k) { return rec[k] !== b; })) return r("REJECT", 1, "tag");
    if (rec[4] !== 1) return r("SKIP", 2, "version");
    var i = 5;
    function take() { if (i + 2 > rec.length) return undefined; var n = (rec[i] << 8) | rec[i + 1]; if (i + 2 + n > rec.length) return undefined; var v = rec.subarray(i + 2, i + 2 + n); i += 2 + n; return v; }
    var ab = take(); if (!ab) return r("REJECT", 4, "truncated");
    if (ab.some(function (b) { return b < 0x21 || b > 0x7e || (b >= 0x41 && b <= 0x5a); })) return r("REJECT", 3, "algorithm-case");
    var algorithm = String.fromCharCode.apply(null, ab);
    if (!KNOWN[algorithm]) return r("SKIP", 3, "algorithm");
    if (i + 34 > rec.length) return r("REJECT", 4, "truncated");
    var identity = rec.slice(i, i + 32), zbit = { z: rec[i + 32], cc: rec[i + 33] }; i += 34;
    var binding = take(); if (!binding) return r("REJECT", 4, "truncated");
    var nonce = take(); if (!nonce) return r("REJECT", 4, "truncated");
    if (i !== rec.length) return r("REJECT", 4, "trailing");
    if (zbit.z < 1) return r("REJECT", 4, "z");
    if (zbit.cc > 99) return r("REJECT", 4, "cc");
    var fields = { algorithm: algorithm, identity: identity, zbit: zbit, binding: binding.slice(), nonce: nonce.slice() };
    if (algorithm !== "sha256d") return r("SKIP", 5, "demo verifies sha256d only", { fields: fields });
    var H = sha256d(rec);
    if (big(H) > target(zbit)) return r("REJECT", 5, "work", { fields: fields, hash: H });
    return { verdict: "ATTRIBUTED", fields: fields, hash: H };
  }

  /** SNP-01 worked example: unbound sha256d 20z00 (snps/vectors/snp01.json "worked_example") */
  var WORKED_EXAMPLE = "534e34550100077368613235366479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798140000000004001644e1";

  return {
    WORKED_EXAMPLE: WORKED_EXAMPLE,
    SCALE: SCALE, TWO_256: TWO_256, TWO_384: TWO_384,
    isZBit: isZBit, parseZBit: parseZBit, formatZBit: formatZBit, target: target, weight: weight, value: value, valueFloat: valueFloat,
    zReal: zReal, zbitOfTarget: zbitOfTarget, zbitOfWeight: zbitOfWeight, addZBits: addZBits, split: split,
    zbitForHashes: zbitForHashes, costCap: costCap, estimateHashrate: estimateHashrate,
    hex: hex, unhex: unhex, hex64: hex64, big: big, utf8: utf8, concat: concat, u16: u16,
    sha256: sha256, sha256d: sha256d, encodeRecord: encodeRecord, recordSpans: recordSpans, verifyRecord: verifyRecord
  };
})();
globalThis.SN = SN;
