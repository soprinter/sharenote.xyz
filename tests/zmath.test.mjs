// The site's Z-bit maths (src/proto/zmath.js) against the SNP-01 conformance vectors (copied from soprinter/snps).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import "../src/proto/zmath.js";

const SN = globalThis.SN;
const v = JSON.parse(readFileSync(new URL("./snp01.vectors.json", import.meta.url)));

test("scale table hash", () => assert.equal(createHash("sha256").update(SN.SCALE.map(String).join(",")).digest("hex"), v.scale.sha256_of_table));
test("targets and weights", () => { for (const z of v.zbits) { const zb = SN.parseZBit(z.zbit); assert.equal(SN.hex64(SN.target(zb)), z.target, z.zbit); assert.equal(SN.weight(zb).toString(), z.weight, z.zbit); } });
test("read-back", () => { for (const r of v.readback) assert.equal(SN.formatZBit(SN.zbitOfTarget(BigInt("0x" + r.target))), r.zbit); });
test("adding notes", () => { for (const a of v.adding) assert.equal(SN.formatZBit(SN.addZBits(a.notes.map(SN.parseZBit))), a.zbit, a.notes.join("+")); });
test("reward split", () => { for (const s of v.split) assert.deepEqual(SN.split(BigInt(s.reward), s.notes.map((n, i) => ({ weight: SN.weight(SN.parseZBit(n)), minH: BigInt(i) }))).map(Number), s.shares); });
test("worked example record", () => { const r = SN.verifyRecord(SN.unhex(v.worked_example.record)); assert.equal(r.verdict, "ATTRIBUTED"); assert.equal(SN.hex(r.hash), v.worked_example.H); });
test("SNP-04 and SNP-05 worked splits", () => {
  const w = (z) => SN.weight(SN.parseZBit(z));
  assert.deepEqual(SN.split(1000n, [{ weight: w("8z00") + w("9z00"), minH: 1n }, { weight: w("10z00"), minH: 2n }]).map(Number), [429, 571]);
  assert.deepEqual(SN.split(1000n, [{ weight: w("8z00") + w("9z00"), minH: 1n }, { weight: w("10z00"), minH: 2n }, { weight: w("9z00"), minH: 3n }]).map(Number), [333, 445, 222]);
});
test("SNP-06 cost cap", () => assert.equal(SN.costCap(1, 3, SN.parseZBit("12z00"), SN.parseZBit("16z00")), 1n));
test("the site's worked example is the SNP-01 vector record", () => assert.equal(SN.WORKED_EXAMPLE, v.worked_example.record));
test("an 8-byte nonce mines past 2^32 tries", () => {
  // the miner writes the try counter big-endian into the last 8 bytes; check the high word is used
  const rec = SN.encodeRecord({ algorithm: "sha256d", identity: SN.unhex("79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"), zbit: { z: 1, cc: 0 }, binding: new Uint8Array(0), nonce: new Uint8Array(8) });
  const n = rec.length, i = 2 ** 32 + 5, hi = Math.floor(i / 2 ** 32), lo = i >>> 0;
  rec[n - 8] = hi >>> 24 & 255; rec[n - 7] = hi >>> 16 & 255; rec[n - 6] = hi >>> 8 & 255; rec[n - 5] = hi & 255;
  rec[n - 4] = lo >>> 24 & 255; rec[n - 3] = lo >>> 16 & 255; rec[n - 2] = lo >>> 8 & 255; rec[n - 1] = lo & 255;
  assert.equal(SN.hex(rec.slice(n - 8)), "0000000100000005");
  assert.equal(SN.verifyRecord(rec).fields.nonce.length, 8);
});
