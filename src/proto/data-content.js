/* Content data for the sharenote.xyz prototype.
 * Source of truth: soprinter/snps (SNP-01..09, README, CHANGELOG, vectors).
 * Plain browser JS: assigns globals on window. No imports, no exports. */

window.SN_SPECS = [
  /* ------------------------------------------------------------------ 01 */
  {
    n: "01",
    title: "Proof of Energy",
    layer: "note",
    status: "draft",
    oneLine: "A self-verifying note of computational work: no issuer, no signature, denominated in Z-bits.",
    summary: `<p>A Sharenote is a proof of energy. It is a small binary record that proves one identity spent a declared amount of work in a stated algorithm. Anyone can check it from the record alone, and nobody has to issue it.</p>
<p>Every note is denominated on one continuous scale, the Z-bit. So notes are comparable, summable and splittable with exact integer math. What a note is worth to you, and what you accept it for, is your application's choice.</p>`,
    audience: ["everyone", "app builders", "relay operators", "miners"],
    depends: [],
    kinds: [
      { kind: 1723, name: "Note", how: "unsigned; a relay stores it only after the record verifies" }
    ],
    tags: [
      { tag: "g", meaning: "the algorithm id, e.g. sha256d" },
      { tag: "z", meaning: "the Z-bit, e.g. 20z00 or 34z10" },
      { tag: "b", meaning: "the binding in lowercase hex; present only when the note is bound" }
    ],
    sections: [
      {
        id: "the-record",
        h: "The record",
        html: `<p>A Sharenote is a compact binary record. The proof is computed over these exact bytes. Multi-byte integers are big-endian.</p>
<table><thead><tr><th>Field</th><th>Bytes</th><th>Meaning</th></tr></thead><tbody>
<tr><td>tag <code>SN4U</code></td><td>4</td><td>separates the record from other bytes hashed the same way</td></tr>
<tr><td><code>version</code></td><td>1</td><td><code>0x01</code></td></tr>
<tr><td><code>algorithm</code></td><td>2 + N</td><td>length, then lowercase ASCII id</td></tr>
<tr><td><code>identity</code></td><td>32</td><td>x-only pubkey credited with the work</td></tr>
<tr><td><code>z-bit</code></td><td>2</td><td><code>z</code> (at least 1), then <code>cc</code> (0 to 99)</td></tr>
<tr><td><code>binding</code></td><td>2 + N</td><td>optional scope; length 0 means unbound</td></tr>
<tr><td><code>nonce</code></td><td>2 + N</td><td>the only field changed while mining</td></tr>
</tbody></table>
<p>The minter commits who, which algorithm, the Z-bit and the binding before searching. The note is worth exactly its Z-bit. A lucky hash earns no bonus. The pubkey sits inside the hash, so the credit cannot move to another identity without fresh work. No signature is needed, so a provider can mine notes credited to you without your key.</p>`
      },
      {
        id: "algorithms-and-bindings",
        h: "Algorithms and bindings",
        html: `<p>Version 1 defines two algorithms. <code>H</code> is read as a big-endian integer over all 32 bytes.</p>
<table><thead><tr><th>id</th><th>H</th></tr></thead><tbody>
<tr><td><code>sha256d</code></td><td><code>SHA-256(SHA-256(record))</code></td></tr>
<tr><td><code>scrypt</code></td><td><code>scrypt(record, salt = record, N = 1024, r = 1, p = 1, 32 bytes)</code></td></tr>
</tbody></table>
<p>Values only compare and add within one algorithm. <code>34z10</code> in one is not <code>34z10</code> in another.</p>
<p>The <code>binding</code> is opaque. The application decides what it commits:</p>
<table><thead><tr><th>binding commits</th><th>the note becomes</th></tr></thead><tbody>
<tr><td>nothing</td><td>prepaid energy, spent later wherever accepted</td></tr>
<tr><td>your own reaction event</td><td>a like backed by work</td></tr>
<tr><td>a service and its current epoch</td><td>access paid in work</td></tr>
<tr><td>a work template</td><td>work that earns a share of a reward</td></tr>
</tbody></table>`
      },
      {
        id: "verification",
        h: "Verification",
        html: `<p>A relay or consumer checks the record, then (relays) the event. The first failing check decides.</p>
<ul>
<li><strong>1. Tag</strong>: starts with <code>SN4U</code> and a version byte, else REJECT.</li>
<li><strong>2. Version</strong>: known, else SKIP.</li>
<li><strong>3. Algorithm</strong>: lowercase ASCII, else REJECT; a registry id, else SKIP.</li>
<li><strong>4. Canonical</strong>: every length honored, nothing left over, valid BIP-340 key, <code>z ≥ 1</code>, <code>cc ≤ 99</code>, else REJECT.</li>
<li><strong>5. Work</strong>: <code>H ≤ target(z-bit)</code>, else REJECT.</li>
<li><strong>6. Envelope</strong> (relays): <code>content</code> is the record in lowercase hex, <code>pubkey</code> equals <code>identity</code>, tags are exactly <code>g</code>/<code>z</code>/<code>b</code> matching the record, <code>id</code> is the NIP-01 id. A <code>sig</code> is ignored.</li>
</ul>
<table><thead><tr><th>Verdict</th><th>Relay</th><th>Consumer</th></tr></thead><tbody>
<tr><td><code>ATTRIBUTED</code>: valid, worth <code>D = 2^256 / T</code></td><td>store</td><td>count</td></tr>
<tr><td><code>REJECT</code>: malformed or not enough work</td><td>drop</td><td>ignore</td></tr>
<tr><td><code>SKIP</code>: unknown version or algorithm</td><td>drop</td><td>ignore</td></tr>
</tbody></table>`
      },
      {
        id: "transport",
        h: "Transport on Nostr",
        html: `<p>A note rides in a <code>kind:1723</code> event. It is unsigned, so the envelope differs from NIP-01: <code>pubkey</code> is the record's identity, <code>content</code> is the record in lowercase hex, <code>created_at</code> is publish time and not part of the proof, and there is no <code>sig</code>. Only relays and clients that support SNP-01 handle these events.</p>
<p>The event carries exactly one <code>g</code>, exactly one <code>z</code>, and one <code>b</code> only when the binding is non-empty. No other tag is allowed: anyone can republish an unsigned record, so a tag outside the record would carry nothing you can trust.</p>
<p>To get the energy behind a binding, query <code>{"kinds":[1723], "#b":["&lt;binding-hex&gt;"]}</code> and add the values per algorithm. The same note can travel in many events, so always count by proof, never by event.</p>`
      },
      {
        id: "z-arithmetic",
        h: "Z-arithmetic",
        html: `<p>A Z-bit <code>NNzcc</code> maps to a target exactly, with integers only:</p>
<pre><code>T(z, c) = floor( 2^(256 - z) · S_c / 2^48 )
S_c     = round( 2^(48 - c/100) )      (scale table, 100 values)</code></pre>
<p>The value is the expected number of hashes, <code>D = 2^256 / T</code>. Implementations carry the weight <code>w = floor(2^384 / T)</code>. To add notes, sum weights and read the total back:</p>
<pre><code>T_total = floor( 2^384 / Σ w_i )
z = 256 - bitlen(T_total), plus 1 if T_total is a power of two
c = max { c' in 0..99 : T(z, c') ≥ T_total }</code></pre>
<table><thead><tr><th>Sum</th><th>Result</th><th>Why</th></tr></thead><tbody>
<tr><td><code>20z00 + 20z00</code></td><td><code>21z00</code></td><td>equal whole-bit notes add one bit</td></tr>
<tr><td><code>2z01 + 2z01</code></td><td><code>3z00</code></td><td>targets round down</td></tr>
<tr><td><code>1z00 + 2z00</code></td><td><code>2z58</code></td><td>2 + 4 = 6, log2 6 ≈ 2.58</td></tr>
</tbody></table>
<p>Rules: one algorithm only, each proof <code>(algorithm, H)</code> once, no floats. Compare amounts by weight, never by read-back Z-bits.</p>`
      },
      {
        id: "splitting",
        h: "Splitting a reward",
        html: `<p>A reward of <code>R</code> whole units is split in proportion to work, the same for every observer, with nothing lost to rounding. Give recipient <code>i</code> the weight <code>w_i</code> of its notes and let <code>W = Σ w_i</code>:</p>
<pre><code>s_i = floor( R · w_i / W )
r_i = R · w_i mod W
L   = R - Σ s_i</code></pre>
<p>Each recipient gets <code>s_i</code>. The <code>L</code> leftover units go one each to the largest remainders <code>r_i</code>. Ties go to the recipient whose smallest <code>H</code> is smallest.</p>
<p>The constraints that hold everything together: only <code>ATTRIBUTED</code> notes count; value comes from the committed Z-bit, never from <code>H</code> or a float <code>log2</code>; sums are exact; a relay verifies before storing; and whether to accept a note, or enforce single use, is the application's policy.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>An unbound <code>20z00</code> note mined with <code>sha256d</code>. Its record is <code>534e3455</code> <code>01</code> <code>0007 73686132353664</code> (sha256d), the 32-byte identity, <code>14 00</code> (20z00), <code>0000</code> (unbound), <code>0004 001644e1</code> (nonce). Hashing gives:</p>
<pre><code>H = 00000e47d8d39787c3a2f7969cfed5400eb7b47e8a80f0d428131903957d9911
T(20z00) = 2^236</code></pre>
<ul>
<li><code>H ≤ T</code>: <strong>ATTRIBUTED</strong>, worth <code>20z00</code>, <code>D = 2^20</code>, about a million hashes.</li>
<li>The same record committing <code>30z00</code> (<code>T = 2^226</code>): <strong>REJECT</strong>, <code>H</code> is too large.</li>
</ul>
<p><strong>Adding.</strong> <code>1z00</code> (value 2) plus <code>2z00</code> (value 4) is 6, which reads back as <code>2z58</code>, not <code>3z00</code>.</p>
<p><strong>Splitting.</strong> R = 10 between those two notes: floors are 3 and 6, one unit left over. The <code>2z00</code> note has the larger remainder, so the final shares are <strong>3</strong> and <strong>7</strong>.</p>`
    },
    tryIt: ["zbit", "mint", "sum"]
  },

  /* ------------------------------------------------------------------ 02 */
  {
    n: "02",
    title: "Z-Chain",
    layer: "mining",
    status: "draft",
    oneLine: "Merged mining: every share on a SHA-256d or scrypt chain becomes a Sharenote, with no extra hashing.",
    summary: `<p>A miner securing a proof-of-work chain can mint Sharenotes for free. The note is committed inside the parent chain's coinbase under the z-chain's slot, chain id <code>0x534E</code> ("SN"). Every share the miner finds, not only full blocks, becomes an attributed note.</p>
<p>The parent chain needs no change. Because every share is public, anyone watching the parent chain can estimate a miner's hashrate from its notes.</p>`,
    audience: ["miners", "rig builders", "relay operators"],
    depends: ["01"],
    kinds: [],
    tags: [],
    sections: [
      {
        id: "algorithms",
        h: "Two new algorithms",
        html: `<p>SNP-02 adds one registry id per parent proof of work. The work is the parent's 80-byte header hash.</p>
<table><thead><tr><th>Algorithm</th><th>Parent proof of work</th></tr></thead><tbody>
<tr><td><code>sha256d-aux</code></td><td><code>SHA-256(SHA-256(header))</code></td></tr>
<tr><td><code>scrypt-aux</code></td><td><code>scrypt(header, salt = header, N = 1024, r = 1, p = 1, 32 bytes)</code></td></tr>
</tbody></table>
<table><thead><tr><th>Part</th><th>Value</th></tr></thead><tbody>
<tr><td>z-chain header</td><td>the SNP-01 record with <code>nonce</code> length 0</td></tr>
<tr><td>z-chain hash</td><td><code>SHA-256d(z-chain header)</code>, a leaf of the aux merkle tree</td></tr>
<tr><td><code>nonce</code></td><td>the proof linking the parent header to the commitment</td></tr>
<tr><td><code>H</code></td><td>the parent header's PoW hash, byte-reversed</td></tr>
</tbody></table>
<p><code>H ≤ T</code> means the parent header cleared the note's own target. A share is enough. It need not be a parent block.</p>`
      },
      {
        id: "commitment",
        h: "The commitment",
        html: `<p>In the first input's script of the parent coinbase, the marker <code>FA BE 6D 6D</code> occurs exactly once, followed by the aux merkle root (32 bytes, byte-reversed), the tree size <code>2^h</code> (4 bytes LE) and the merkle nonce (4 bytes LE).</p>
<p>The z-chain's slot comes from chain id <code>0x534E</code> and the merkle nonce <code>n</code>, on unsigned 32-bit integers:</p>
<pre><code>r = n
r = r * 1103515245 + 12345
r = r + 0x534E
r = r * 1103515245 + 12345
slot = r mod 2^h</code></pre>
<p>For <code>n = 1</code>, <code>h = 2</code> the slot is 1. With <code>h = 0</code> the z-chain is alone and its hash is the root. Two chains collide when their ids agree in the lowest <code>h</code> bits, so a builder raises <code>h</code> until every slot differs.</p>`
      },
      {
        id: "one-record-per-header",
        h: "One record per header",
        html: `<p>A parent header commits at most one z-chain record, so the same work is never credited twice: not to two identities, two offers or two algorithms. Three locks fix a single leaf:</p>
<table><thead><tr><th>Lock</th><th>Verifier checks</th><th>Without it</th></tr></thead><tbody>
<tr><td>one root</td><td>the marker occurs exactly once</td><td>a second marker carries a second tree</td></tr>
<tr><td>one height</td><td>tree size = 2^(aux branch length)</td><td>a forged size shifts the slot</td></tr>
<tr><td>one slot</td><td>side mask = the z-chain's slot</td><td>a z-chain hash in another leaf would verify</td></tr>
</tbody></table>
<p>Other merged chains may fill the other leaves. Only the leaf at the z-chain's slot verifies.</p>`
      },
      {
        id: "proof-and-verification",
        h: "Proof and verification",
        html: `<p>The record's <code>nonce</code> holds, in order: the 80-byte parent header, the coinbase length (2) and coinbase, the coinbase branch (count, then hashes), the aux branch (count, then hashes) and a 4-byte side mask. Each branch has at most 30 hashes; the whole proof at most 65,535 bytes. A merged note is about 300 to 1,000 bytes.</p>
<p>A merged note passes SNP-01 checks 1 to 4 as usual. Check 5 becomes, with any failure a REJECT:</p>
<ul>
<li>the nonce parses as a proof with nothing left over;</li>
<li>the coinbase branch reaches the header's merkle root;</li>
<li>the commitment is exact and the aux branch climbs from the z-chain hash to its root (the three locks);</li>
<li><code>H ≤ T</code>.</li>
</ul>
<p>Changing algorithm, identity, Z-bit or binding changes the z-chain hash. So a share cannot be re-claimed, raised to a higher Z-bit, or pointed at another offer.</p>`
      },
      {
        id: "building",
        h: "Building and solo merged mining",
        html: `<ul>
<li><strong>Z-chain header</strong>: the SNP-01 record with the <code>-aux</code> id, identity, Z-bit, binding and an empty nonce. Hash it.</li>
<li><strong>Tree</strong>: alone, <code>h = 0</code>. Otherwise pick <code>h</code> so every slot differs.</li>
<li><strong>Coinbase</strong>: write the marker, root, size and merkle nonce once, beside an extra-nonce.</li>
<li><strong>Template</strong>: coinbase first; the extra-nonce changes the merkle root, not the branch.</li>
<li><strong>Mine</strong>: each header with <code>H ≤ T</code> is a share; publish it as a note. A header that clears the parent target is submitted as a block.</li>
</ul>
<p>A miner needs no pool. From its own node it chooses any binding: a service epoch (access paid in work), a reaction (a like), a sale (a bid) or nothing (an unbound note). A share that is also a block pays the miner as usual.</p>`
      },
      {
        id: "hashrate",
        h: "Hashrate from shares",
        html: `<p>Take a miner's merged notes in the parent's algorithm, each <code>H</code> once, mined on a block you saw arrive or a descendant. With <code>t</code> seconds since that arrival:</p>
<pre><code>rate ≈ (1 / t) · Σ 2^256 / T_i</code></pre>
<p>Withholding shares only lowers the estimate. The spread is about <code>1/√n</code> for <code>n</code> shares of one size:</p>
<table><thead><tr><th>Shares</th><th>Spread</th></tr></thead><tbody>
<tr><td>10</td><td>±32 %</td></tr>
<tr><td>100</td><td>±10 %</td></tr>
<tr><td>1,000</td><td>±3 %</td></tr>
</tbody></table>
<p>A miner hashing <code>R</code> times per second at <code>z</code> makes about <code>R / 2^z</code> notes per second. Raise the share size to keep relays comfortable. Withheld blocks cannot be detected from notes.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>The <code>scrypt-aux</code> test vector: a <code>4z00</code> note, the z-chain in slot 1 of a tree of height 2 (merkle nonce 1, tree size 4).</p>
<table><thead><tr><th></th><th>Value</th><th>Result</th></tr></thead><tbody>
<tr><td><code>H</code></td><td><code>0ac77cf9…c84126ad</code></td><td></td></tr>
<tr><td>note target, <code>4z00</code></td><td><code>1000…0000</code> (2^252)</td><td>H is below: a valid note</td></tr>
<tr><td>parent target, bits <code>1e0fffff</code></td><td><code>00000fffff00…00</code></td><td>H is above: not a block</td></tr>
</tbody></table>
<p>The record is 386 bytes: <code>SN4U</code>, version 1, <code>scrypt-aux</code>, identity, <code>04 00</code>, a 32-byte binding, and a 299-byte nonce holding the 80-byte parent header, a 115-byte coinbase with <code>fa be 6d 6d</code> + aux root + tree size 4 + merkle nonce 1, one coinbase-branch hash, two aux-branch hashes (#3 then #2) and side mask 1.</p>
<p>The aux branch climbs <code>#1 = SHA-256d(#3 ‖ leaf)</code> (mask bit 1, running hash on the right), then <code>#0 = SHA-256d(#1 ‖ #2)</code>. If <code>#0</code> equals the root after the marker, the leaf is in the tree. The header is a share: it mints a note, while the parent chain would refuse it as a block.</p>`
    },
    tryIt: ["merged", "planner"]
  },

  /* ------------------------------------------------------------------ 03 */
  {
    n: "03",
    title: "Announcement",
    layer: "discovery",
    status: "draft",
    oneLine: "Addressable Nostr events that say: I mine notes for you, I serve block templates, or pay me here.",
    summary: `<p>A key announces what it offers around Sharenotes, and how to pay it, so others can find it. There are three announcements: a provider (<code>31724</code>), a node service provider (<code>31725</code>) and a pay destination (<code>31726</code>).</p>
<p>Each is an addressable event. The author keeps one per <code>d</code> value, replaces it to update and deletes it to withdraw. Jobs, orders and receipts name the version they relied on by event id, so past terms stay provable.</p>`,
    audience: ["providers", "NSPs", "miners", "workers", "app builders"],
    depends: ["01"],
    kinds: [
      { kind: 31724, name: "Provider", how: "signed, addressable; reached at the author's NIP-17 inbox relays" },
      { kind: 31725, name: "NSP", how: "signed, addressable; points to an SNP-07 gRPC endpoint" },
      { kind: 31726, name: "Pay", how: "signed, addressable; one per chain, or d = lightning" },
      { kind: 5, name: "Deletion (NIP-09)", how: "withdraws an announcement by its a tag" }
    ],
    tags: [
      { tag: "d", meaning: "service id; for Pay, a chain genesis id or lightning" },
      { tag: "g", meaning: "algorithm (Provider: with largest Z-bit; NSP: an -aux id)" },
      { tag: "c", meaning: "NSP: a chain genesis id it serves" },
      { tag: "max", meaning: "Provider: most notes per order" },
      { tag: "price", meaning: "Provider: amount, unit, algorithm, Z-bit" },
      { tag: "url", meaning: "NSP: https endpoint with no path" },
      { tag: "fee", meaning: "NSP: share of each block reward, parts per million" },
      { tag: "pay", meaning: "Pay: method and destination, preferred first" }
    ],
    sections: [
      {
        id: "common-rules",
        h: "Common rules",
        html: `<ul>
<li>A <strong>chain</strong> is named by its genesis block id, 64 lowercase hex in the chain's display order.</li>
<li>A <code>url</code> is <code>https</code> with no trailing slash; a <code>relay</code> is <code>wss://</code>.</li>
<li>Numbers are decimals without sign or leading zeros. Counts and seconds are at most <code>2^53 - 1</code>; amounts have no bound.</li>
<li>The <strong>newest</strong> version of an address (greatest <code>created_at</code>, then lowest <code>id</code>) is the announcement. If it breaks a rule, the address has no valid announcement. Clients never fall back to an older one.</li>
<li>An optional NIP-40 <code>expiration</code>; from that second on the announcement is expired.</li>
<li>An announcement binds only its author. Clients trust a URL by the key that announced it.</li>
</ul>`
      },
      {
        id: "provider",
        h: "Provider (kind 31724)",
        html: `<p>A key that mines notes on others' behalf (SNP-06).</p>
<table><thead><tr><th>Tag</th><th>Rule</th></tr></thead><tbody>
<tr><td><code>d</code></td><td>service id</td></tr>
<tr><td><code>g</code></td><td>algorithm and the largest Z-bit mined; one or more, one per algorithm</td></tr>
<tr><td><code>max</code></td><td>most notes in one order, 1 to 2^53 - 1; exactly one</td></tr>
<tr><td><code>horizon</code></td><td>how far ahead an order may expire, seconds; absent means 86400</td></tr>
<tr><td><code>price</code></td><td><code>&lt;amount&gt; &lt;unit&gt; &lt;algorithm&gt; &lt;Z-bit&gt;</code>: the price of one note of that size; at most one per algorithm</td></tr>
</tbody></table>
<p>A provider has no <code>url</code>. Orders reach it as gift wraps at its NIP-17 <code>kind:10050</code> inbox relays. An announcement with a <code>url</code> tag is not valid. Find providers with <code>{"kinds":[31724], "#g":["sha256d"]}</code>.</p>`
      },
      {
        id: "nsp",
        h: "NSP (kind 31725)",
        html: `<p>A key that runs chain nodes and serves block templates (SNP-07). One event per service.</p>
<table><thead><tr><th>Tag</th><th>Rule</th></tr></thead><tbody>
<tr><td><code>c</code></td><td>a parent chain's genesis id; one or more</td></tr>
<tr><td><code>g</code></td><td><code>sha256d-aux</code> or <code>scrypt-aux</code>; one or more</td></tr>
<tr><td><code>url</code></td><td>the SNP-07 endpoint, no path; exactly one</td></tr>
<tr><td><code>fee</code></td><td>share of each block reward paid to the NSP, ppm, at most 1000000; absent means none</td></tr>
</tbody></table>
<p>Miners find NSPs with <code>{"kinds":[31725], "#c":["&lt;genesis id&gt;"]}</code>. A client names the service by its address <code>31725:&lt;pubkey&gt;:&lt;d&gt;</code> and the version by event id. A template paying the NSP more than its <code>fee</code> is dropped by the client.</p>`
      },
      {
        id: "pay",
        h: "Pay (kind 31726)",
        html: `<p>Where to pay an identity, signed by the key its notes credit, so no one else can redirect its pay.</p>
<ul>
<li><code>d</code>: a chain genesis id, or <code>lightning</code> for any payment over Lightning.</li>
<li><code>pay</code>: <code>["pay","lightning",&lt;address or LNURL&gt;]</code> or <code>["pay","onchain",&lt;address&gt;]</code>, preferred first. A destination that carries a secret, such as a wallet connection string, must never be announced.</li>
<li><code>min</code>: the smallest payment wanted; a payer carries smaller amounts over. Compared only in the same unit, or <code>sat</code> against <code>msat</code> (1 sat = 1000 msat).</li>
<li><code>relay</code>: at most 8; payers publish receipts here too.</li>
</ul>
<p>A payer queries <code>{"kinds":[31726], "authors":[&lt;identity&gt;], "#d":[&lt;chain&gt;, "lightning"]}</code>. A receipt names the version it paid to.</p>`
      },
      {
        id: "withdrawal",
        h: "Withdrawal",
        html: `<p>An author withdraws an announcement with a NIP-09 <code>kind:5</code> deletion carrying <code>["a", "&lt;kind&gt;:&lt;pubkey&gt;:&lt;d&gt;"]</code>.</p>
<ul>
<li>It withdraws every version whose <code>created_at</code> is at most its own. A later version announces again.</li>
<li>Only an <code>a</code> tag naming the deletion's own key withdraws. A deletion by another key does nothing.</li>
<li>A withdrawn or expired announcement offers nothing. Clients must not order, connect or pay by it.</li>
<li>A job, order or receipt that already names one of its versions still stands.</li>
</ul>
<p>An announcement is a claim, not a guarantee. SNP-06 and SNP-07 define what can be checked of what it delivers.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>The provider from the SNP-06 example announces one service:</p>
<pre><code>"kind": 31724,
"tags": [
  ["d", "main"],
  ["g", "sha256d", "24z00"],
  ["max", "100"],
  ["price", "1", "sat", "sha256d", "16z00"]
]</code></pre>
<p>It mines <code>sha256d</code> notes up to <code>24z00</code>, at most 100 per order. One <code>16z00</code> note costs 1 sat, so smaller notes cost proportionally less. No <code>horizon</code>, so orders may expire at most 86400 seconds ahead.</p>
<p>A Pay announcement with <code>["min", "5000", "msat"]</code> compares with a payment of 3 sat: 3 sat is 3000 msat, below the minimum, so the payer carries it over. A <code>min</code> in a unit the payer cannot compare means the payer must not pay by that announcement.</p>`
    },
    tryIt: ["network", "buy"]
  },

  /* ------------------------------------------------------------------ 04 */
  {
    n: "04",
    title: "Work Offer",
    layer: "paid-work",
    status: "draft",
    oneLine: "An issuer asks for work toward a fixed template; workers answer with notes; contributions are public.",
    summary: `<p>An issuer publishes a work offer: the algorithm, a template, the minimum Z-bit, and optionally a reward and a close time. Workers answer with Sharenotes bound to it, so the work done for the offer is public and tied to a template that can never change.</p>
<p>An offer can also reward notes bound to an existing event, or to events of a given kind that reference it. Then the same work counts there too, for example likes on a post.</p>`,
    audience: ["issuers", "workers", "miners", "auditors"],
    depends: ["01"],
    kinds: [
      { kind: 1726, name: "Offer", how: "signed, regular event: it can never change" },
      { kind: 1723, name: "Note", how: "workers answer with SNP-01 notes bound to the offer" }
    ],
    tags: [
      { tag: "g", meaning: "the algorithm; exactly one" },
      { tag: "z", meaning: "the minimum Z-bit accepted; exactly one" },
      { tag: "reward", meaning: "amount and unit to split among workers; optional" },
      { tag: "method", meaning: "lightning or onchain; with reward only" },
      { tag: "closes", meaning: "unix seconds; notes seen before it count for the reward" },
      { tag: "target", meaning: "reward work bound to this event id instead" },
      { tag: "via", meaning: "reward work bound to events of this kind that reference the target" },
      { tag: "relay", meaning: "where workers publish and auditors read; 1 to 8" }
    ],
    sections: [
      {
        id: "the-offer",
        h: "The offer",
        html: `<p>An offer is a signed <code>kind:1726</code> regular event. Its <code>content</code> is the <strong>template</strong>: an opaque description the notes commit to through the offer id. The work is never computed over it, and its format is the application's.</p>
<ul>
<li><code>z</code> is a canonical Z-bit, <code>1 ≤ z ≤ 255</code>, two-digit <code>cc ≤ 99</code>.</li>
<li><code>reward</code> is a positive integer in the smallest unit; the unit name is the issuer's.</li>
<li><code>closes</code>: the issuer counts only notes it first saw on its relays strictly before that second. A note's <code>created_at</code> is not evidence.</li>
<li><code>via</code> needs <code>target</code>; one tag per kind, at most 65535.</li>
<li>1 to 8 <code>relay</code> tags, so every worker can publish to, and every auditor read, all of them.</li>
</ul>
<p>An offer that breaks a count or form rule is invalid and ignored. Workers find offers with <code>{"kinds":[1726], "#g":["&lt;algorithm&gt;"]}</code>.</p>`
      },
      {
        id: "answering",
        h: "Answering an offer",
        html: `<p>A worker mines SNP-01 notes credited to itself and publishes each to the offer's relays. The binding is a single id:</p>
<table><thead><tr><th>Offer has</th><th>binding</th></tr></thead><tbody>
<tr><td>neither target nor via</td><td>the offer's id</td></tr>
<tr><td>target</td><td>the target's id</td></tr>
<tr><td>target and via</td><td>the id of a via-kind event that has an <code>e</code> tag to the target and is signed by the note's identity</td></tr>
</tbody></table>
<p>A note answers the offer when it verifies <code>ATTRIBUTED</code>, its algorithm equals <code>g</code>, its binding is the one rewarded, and its target is at most the <code>z</code> target.</p>
<p>A note bound to the offer's id is newer than the offer and tied to its exact template. A note proves only that work was committed to its binding. Nothing here checks that the template's task was performed.</p>`
      },
      {
        id: "via-events",
        h: "Events of a via kind",
        html: `<p>For an offer with <code>via</code>, the worker first signs an event of one of those kinds, then binds its notes to that event's id. The event must:</p>
<ul>
<li>have a valid NIP-01 <code>id</code> and <code>sig</code>;</li>
<li>be signed by the same key as the notes' <code>identity</code>, so work counts only through an action that person signed;</li>
<li>carry an <code>e</code> tag equal to the offer's <code>target</code>.</li>
</ul>
<p>What the event means is its own spec's business. The note has one binding and counts once: for the event, under that event's own spec, and toward the offer. For example, an offer with <code>target</code> = a post and <code>via</code> = <code>7</code> counts work behind reactions to that post.</p>`
      },
      {
        id: "contributions",
        h: "Contributions",
        html: `<p>A worker's <strong>contribution</strong> is the total weight of its notes that answer the offer, each <code>(algorithm, H)</code> once. Anyone computes it from the union of the offer's relays:</p>
<table><thead><tr><th>Offer has</th><th>Query on each relay</th></tr></thead><tbody>
<tr><td>neither</td><td><code>{"kinds":[1723], "#b":[&lt;offer id&gt;]}</code></td></tr>
<tr><td>target</td><td><code>{"kinds":[1723], "#b":[&lt;target id&gt;]}</code></td></tr>
<tr><td>target and via</td><td><code>{"kinds":[&lt;via&gt;], "#e":[&lt;target id&gt;]}</code>, then <code>{"kinds":[1723], "#b":[&lt;event ids&gt;]}</code></td></tr>
</tbody></table>
<p>For the reward, the issuer counts only notes it first saw at or after it published the offer, and before <code>closes</code>. Later notes still count toward public contributions.</p>`
      },
      {
        id: "reward",
        h: "Splitting the reward",
        html: `<p>With a <code>reward</code>, the issuer splits it by SNP-01 §Splitting a reward. Each distinct <code>identity</code> is one recipient, weighted by the contribution over the notes the issuer counted. With no counted notes, nothing is split.</p>
<p>The issuer's counted set can differ from what an observer sees. This spec makes contributions auditable, not payouts; SNP-05 receipts close that gap. How the issuer pays is outside this spec, though <code>method</code> says which SNP-03 Pay destinations it uses.</p>
<p>Trust points: the reward is a promise with no escrow; the issuer is trusted for <code>closes</code> and for what it counted; a listed relay can withhold notes, so workers publish to every relay and keep their own records.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>An offer has <code>["reward", "1000", "sat"]</code>. Two workers answer it:</p>
<table><thead><tr><th>Worker</th><th>Notes</th><th>Contribution</th><th>Share of 1000</th></tr></thead><tbody>
<tr><td>Alice</td><td><code>8z00</code>, <code>9z00</code></td><td>2^8 + 2^9 = 768, reads <code>9z58</code></td><td><strong>429</strong></td></tr>
<tr><td>Bob</td><td><code>10z00</code></td><td>2^10 = 1024, reads <code>10z00</code></td><td><strong>571</strong></td></tr>
</tbody></table>
<p>W = 1792. The floors are 1000 · 768 / 1792 = 428.57 → 428 and 1000 · 1024 / 1792 = 571.43 → 571. That leaves one unit. Alice's remainder is larger, so she gets it: 429 and 571, exactly 1000.</p>`
    },
    tryIt: ["offer", "sum"]
  },

  /* ------------------------------------------------------------------ 05 */
  {
    n: "05",
    title: "Payout Receipts",
    layer: "paid-work",
    status: "draft",
    oneLine: "A signed receipt of who gets what and which notes counted, so anyone can audit an offer's payout.",
    summary: `<p>When an issuer splits an offer's reward, it publishes a signed receipt: who gets how much, and exactly which notes it counted. Anyone holding the offer can check that the amounts follow from the stated weights.</p>
<p>With the notes from the offer's relays, anyone can check the weights. Anyone holding a note the receipt leaves out can name it as an omission. A false receipt is proven by the issuer's own signature.</p>`,
    audience: ["issuers", "workers", "auditors"],
    depends: ["01", "03", "04"],
    kinds: [
      { kind: 1727, name: "Receipt", how: "signed by the offer's issuer, published to every relay the offer names" },
      { kind: 14, name: "Destination request (NIP-17)", how: "gift-wrapped DM asking for a BOLT11 invoice" }
    ],
    tags: [
      { tag: "e", meaning: "the offer id; exactly one" },
      { tag: "reward", meaning: "equal to the offer's reward; exactly one" },
      { tag: "pay", meaning: "identity, amount, weight, min H; one per identity" },
      { tag: "n", meaning: "algorithm:H of one counted note; one per note" },
      { tag: "closed", meaning: "cutoff, only for an offer without closes" }
    ],
    sections: [
      {
        id: "the-receipt",
        h: "The receipt",
        html: `<p>A <code>kind:1727</code> event with empty <code>content</code>, signed by the offer's issuer.</p>
<ul>
<li><code>pay</code>: <code>[identity, amount, weight, min H]</code>, one per identity with at least one counted note, even if its amount is 0. <code>weight</code> sums the SNP-01 weights <code>floor(2^384 / T)</code>; <code>min H</code> is the tie-breaker.</li>
<li><code>n</code>: <code>&lt;algorithm&gt;:&lt;H&gt;</code>, H in 64 lowercase hex. A note is named by its key, never by event id.</li>
<li>No two <code>pay</code> tags share an identity or a <code>min H</code>.</li>
</ul>
<p>The <strong>cutoff</strong> is when the issuer stopped counting: the offer's <code>closes</code>, else <code>closed</code>, else the receipt's <code>created_at</code>. A receipt exists only for a valid offer with a reward and at least one counted note. Readers find it with <code>{"kinds":[1727], "authors":[&lt;issuer&gt;], "#e":[&lt;offer id&gt;]}</code>.</p>`
      },
      {
        id: "issuer-rules",
        h: "What the issuer must do",
        html: `<p>A receipt is <strong>malformed</strong>, and ignored, if it is not signed by the issuer, has non-empty content, points to an offer without a reward, has <code>closed</code> while the offer has <code>closes</code>, or has a tag missing, repeated or ill-formed.</p>
<p>The issuer must make a well-formed receipt <strong>true</strong>:</p>
<ul>
<li><code>reward</code> equals the offer's;</li>
<li>amounts follow the SNP-01 split and add up to exactly the reward;</li>
<li>one <code>n</code> per counted note, each answering the offer;</li>
<li>weights and <code>min H</code> match those notes;</li>
<li>every counted note is published to the offer's relays.</li>
</ul>
<p>Once it publishes a receipt, the cutoff is fixed. Two receipts for one offer with different <code>reward</code>, <code>pay</code>, <code>n</code> or cutoff are an equivocation.</p>`
      },
      {
        id: "auditing",
        h: "Auditing",
        html: `<table><thead><tr><th>Finding</th><th>Needs notes</th><th>Means</th></tr></thead><tbody>
<tr><td>amounts do not follow from the receipt's weights</td><td>no</td><td>provably false</td></tr>
<tr><td><code>reward</code> differs from the offer's</td><td>no</td><td>provably false</td></tr>
<tr><td>a key listed twice</td><td>no</td><td>provably false</td></tr>
<tr><td>two receipts differ in reward, pay, n or cutoff</td><td>no</td><td>equivocation, naming both</td></tr>
<tr><td>a listed note does not answer the offer</td><td>yes</td><td>provably false</td></tr>
<tr><td>weights or tie-breakers differ from the notes</td><td>yes, all</td><td>provably false</td></tr>
<tr><td>a listed note found nowhere</td><td>yes</td><td>unverified</td></tr>
<tr><td>an answering note on the relays before the cutoff is not listed</td><td>yes</td><td>omission</td></tr>
<tr><td>an answering note not known on the relays before the cutoff</td><td>yes</td><td>late; nothing against the issuer</td></tr>
</tbody></table>
<p>An auditor holding several receipts audits each against the latest cutoff.</p>`
      },
      {
        id: "omission-vs-late",
        h: "Omission or late",
        html: `<p>No auditor can know when the issuer first saw a note. So an unlisted note is an <strong>omission</strong> only if the auditor knows it was on one of the offer's relays before the cutoff: a worker from the relay's <code>OK</code> when it published, anyone from having fetched it there.</p>
<p>Otherwise the note is <strong>late</strong>. It may have reached the issuer too late to count, and that is no claim against the issuer.</p>
<p>An omission is not proof of fraud: the issuer may say the note never reached it. But whoever holds the note can name it. An issuer gains nothing by republishing with an earlier cutoff: no omission turns late, and the pair proves equivocation.</p>`
      },
      {
        id: "destination",
        h: "Asking for a destination",
        html: `<p>An issuer pays each identity at its SNP-03 Pay announcement. If an identity has no destination for a method the issuer uses, and the unit is <code>sat</code> or <code>msat</code>, the issuer may ask once per receipt by a NIP-17 <code>kind:14</code> DM tagged <code>p</code> (identity), <code>e</code> (receipt id) and <code>amount</code>.</p>
<p>The identity answers with a <code>kind:14</code> DM tagged <code>["e", &lt;request rumor id&gt;]</code> whose content is a BOLT11 invoice. The issuer pays it only if it is for exactly that amount, on the right network, and no invoice was paid for that request before. Until paid, the amount stays owed.</p>
<p>Each <code>n</code> tag is about 80 bytes. Relays often cap events near 64 KB, so a receipt holds several hundred notes; an issuer expecting more sets a larger <code>z</code>.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>An offer asks for <code>sha256d</code> notes of at least <code>8z00</code> and rewards <code>1000 sat</code>. Alice publishes <code>8z00</code> and <code>9z00</code> (weight 768), Bob <code>10z00</code> (1024), Carol <code>9z00</code> (512). Total 2304.</p>
<table><thead><tr><th>Receipt</th><th>Audit</th></tr></thead><tbody>
<tr><td>counts all four notes; pays Alice <strong>333</strong>, Bob <strong>445</strong>, Carol <strong>222</strong></td><td>consistent</td></tr>
<tr><td>counts only Alice's and Bob's; pays 429 and 571</td><td>consistent; Carol's <code>9z00</code> named as omitted</td></tr>
<tr><td>counts all four; pays Alice 383, Bob 395, Carol 222</td><td>provably false: the split gives 333 and 445</td></tr>
</tbody></table>
<p>Why 333/445/222: the floors are 333, 444 and 222, which sum to 999. The leftover unit goes to the largest remainder, Bob's (1000 · 1024 mod 2304 = 1024, against 768 for Alice and 512 for Carol).</p>`
    },
    tryIt: ["audit", "offer"]
  },

  /* ------------------------------------------------------------------ 06 */
  {
    n: "06",
    title: "Mining Providers",
    layer: "paid-work",
    status: "draft",
    oneLine: "Order notes mined on your behalf over Nostr: a gift-wrapped order, a Lightning quote, checked delivery.",
    summary: `<p>Not every device can mine. A provider mines Sharenotes for you: you name the identity to credit, the binding and the Z-bit, and you receive the notes. The provider never needs the identity's key.</p>
<p>Providers announce themselves (SNP-03). Any app can place an order over relays. The provider quotes it with a Lightning invoice, mines once paid, and you check every note it delivers. A rig behind NAT can be a provider: nothing needs a public endpoint.</p>`,
    audience: ["app builders", "providers", "phone and browser users", "AI agents"],
    depends: ["01", "03"],
    kinds: [
      { kind: 1724, name: "Order", how: "rumor, NIP-59 gift-wrapped to the provider's kind:10050 inbox" },
      { kind: 1725, name: "Quote", how: "rumor, gift-wrapped back: one BOLT11 invoice per order" },
      { kind: 1731, name: "Status", how: "rumor, gift-wrapped back: queued, mining, done or failed" }
    ],
    tags: [
      { tag: "a", meaning: "31724:<provider>:<service id>" },
      { tag: "e", meaning: "the announcement version relied on" },
      { tag: "g", meaning: "an algorithm the provider announces" },
      { tag: "z", meaning: "Z-bit of each note" },
      { tag: "identity", meaning: "the key the notes credit" },
      { tag: "b", meaning: "binding hex, 1 to 1024 bytes; absent for unbound" },
      { tag: "count", meaning: "number of notes, 1 to max" },
      { tag: "relay", meaning: "where the provider also publishes each note; at most 8" },
      { tag: "expiration", meaning: "until when the provider may take the order" }
    ],
    sections: [
      {
        id: "transport",
        h: "Transport",
        html: `<p>An <strong>order</strong> (<code>kind:1724</code>) goes from the customer to the provider. A <strong>quote</strong> (<code>kind:1725</code>) and <strong>statuses</strong> (<code>kind:1731</code>) come back. All are NIP-59 gift wraps, one per recipient, sent to the recipient's NIP-17 <code>kind:10050</code> inbox relays.</p>
<p>The customer is the key that signed the order's seal, the <strong>ordering key</strong>. It need not be the identity credited. The recipient drops a message whose seal pubkey differs from its rumor pubkey. The customer drops a quote or status not from the provider of one of its orders.</p>
<p>Relays see a wrap addressed to someone, but neither who orders from whom nor what is ordered.</p>`
      },
      {
        id: "pricing",
        h: "Pricing",
        html: `<p>The provider's <code>price</code> tag gives the cost of one note of a reference Z-bit. An order of <code>count</code> notes of Z-bit <code>z</code> costs at most:</p>
<pre><code>ceil( amount · count · w(z) / w(price Z-bit) )</code></pre>
<p>with <code>w</code> the SNP-01 weight. A provider must not ask more. The cap is the provider's own announcement as it stands when it issues the quote. Quotes are paid over Lightning, so a cap compares only in <code>sat</code> or <code>msat</code>. Without a <code>price</code> for the algorithm, the price is whatever the invoice asks. A <code>price</code> of 0 means the order is queued at once with no quote.</p>`
      },
      {
        id: "order-checks",
        h: "Order checks and refusals",
        html: `<p>The provider checks in order and answers the first failure with a <code>failed</code> status and its reason:</p>
<table><thead><tr><th>#</th><th>Check</th><th>Reason</th></tr></thead><tbody>
<tr><td>1</td><td>required tags once each, well-formed</td><td><code>invalid-tag</code></td></tr>
<tr><td>2</td><td><code>a</code> names a live service of its own</td><td><code>unknown-service</code></td></tr>
<tr><td>3</td><td>the announcement lists <code>g</code></td><td><code>unknown-algorithm</code></td></tr>
<tr><td>4</td><td><code>z</code> at most the announced Z-bit</td><td><code>z-too-large</code></td></tr>
<tr><td>5</td><td><code>count</code> from 1 to <code>max</code></td><td><code>count-out-of-range</code></td></tr>
<tr><td>6</td><td><code>identity</code> is a valid x-only key</td><td><code>invalid-identity</code></td></tr>
<tr><td>7</td><td><code>b</code> is even-length hex, 1 to 1024 bytes</td><td><code>invalid-binding</code></td></tr>
<tr><td>8</td><td>at most 8 <code>wss://</code> relays</td><td><code>invalid-relays</code></td></tr>
<tr><td>9</td><td><code>expiration</code> within <code>horizon</code></td><td><code>over-limit</code></td></tr>
<tr><td>10</td><td>room for one more order</td><td><code>busy</code></td></tr>
</tbody></table>
<p>An order without one valid <code>expiration</code>, or received already expired, is dropped without answer.</p>`
      },
      {
        id: "paying",
        h: "Paying",
        html: `<ul>
<li>The provider issues <strong>one quote per order</strong>: a BOLT11 invoice with an amount, and an <code>expiration</code>. The invoice never outlives the quote. Price and terms are fixed at quote time.</li>
<li>The customer pays only if it never paid a quote for this order, the quote is not near or past expiry, the invoice has an amount on the right network, and the amount is within the cap.</li>
<li>A quote is <strong>paid</strong> once the provider matches a payment settled by the quote's expiration. It then sends <code>queued</code>. A payment settled in time counts even if matched late, after a restart.</li>
<li>With no payment settled in time, the order ends <code>failed</code> with <code>unpaid</code>. A later payment is never taken.</li>
<li>A resent order before payment gets the same quote. The customer must not pay it twice.</li>
</ul>
<p>A provider must not mine before payment, unless nothing was due.</p>`
      },
      {
        id: "statuses",
        h: "Statuses",
        html: `<table><thead><tr><th>State</th><th>Meaning</th></tr></thead><tbody>
<tr><td><code>queued</code></td><td>taken, paid or free, waiting for hashrate</td></tr>
<tr><td><code>mining</code></td><td>being mined; lists notes so far</td></tr>
<tr><td><code>done</code></td><td><code>count</code> notes delivered</td></tr>
<tr><td><code>failed</code></td><td>refused, <code>unpaid</code>, <code>stopped</code> or <code>unavailable</code></td></tr>
</tbody></table>
<p>Notes are numbered from 0. A status lists consecutive notes from <code>["from", i]</code> on; absent, from 0. A non-final status may list only new notes. A final status lists every note. Large statuses split into parts with <code>["part", i, n]</code>.</p>
<p>The customer holds <code>h</code> notes. A status with <code>from ≤ h</code> is applied. A status with <code>from &gt; h</code> is a <strong>gap</strong>: nothing of it is applied, and the customer resends the order. The answer to a resend lists every note.</p>`
      },
      {
        id: "checking",
        h: "Checking a delivery",
        html: `<p>The customer must check every delivered note before relying on it:</p>
<ul>
<li>SNP-01 record checks 1 to 5 give <code>ATTRIBUTED</code>;</li>
<li>its algorithm, identity and binding equal the order's;</li>
<li>its Z-bit is at least the order's <code>z</code>;</li>
<li>its <code>(algorithm, H)</code> was never received before, in any order.</li>
</ul>
<p>At most <code>count</code> passing notes count. Work is certainly new only when the binding is new. For a reused binding, a provider can deliver notes that already existed. Unbound notes can never be shown fresh.</p>
<p>The provider sees every note first. A note that works as a bearer payment can be spent by the provider. Order those only from a provider you trust, and never with <code>relay</code>.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>A provider announces <code>["g","sha256d","24z00"]</code>, <code>["max","100"]</code> and <code>["price","1","sat","sha256d","16z00"]</code>. Alice's phone orders three <code>12z00</code> notes, credited to Alice and bound to a new reaction id.</p>
<pre><code>ceil( 1 · 3 · w(12z00) / w(16z00) ) = ceil( 3 · 2^140 / 2^144 ) = ceil(0.1875) = 1 sat</code></pre>
<table><thead><tr><th>Step</th><th>Result</th></tr></thead><tbody>
<tr><td>order O</td><td>quote: invoice <code>lnbc10n1…</code> (1 sat), expiring in 10 minutes</td></tr>
<tr><td>O resent</td><td>the same quote</td></tr>
<tr><td>Alice pays 1 sat; provider matches it</td><td><code>queued</code></td></tr>
<tr><td>mining</td><td><code>mining</code>, note 0, <code>from 1</code> note 1, <code>done</code> with all three; all pass</td></tr>
<tr><td>status <code>from 1</code> arrives before note 0</td><td>a gap: Alice resends O, gets notes 0 and 1</td></tr>
<tr><td>a quote for 2 sat</td><td>over the cap: not paid</td></tr>
<tr><td>an order with count 101</td><td><code>failed</code>, <code>count-out-of-range</code></td></tr>
<tr><td>notes bound to another binding</td><td>all fail the checks</td></tr>
<tr><td>one note credited to Bob</td><td>passes: a gift</td></tr>
<tr><td>an order expiring in 2 days</td><td><code>failed</code>, <code>over-limit</code> (horizon 1 day)</td></tr>
</tbody></table>`
    },
    tryIt: ["buy", "planner"]
  },

  /* ------------------------------------------------------------------ 07 */
  {
    n: "07",
    title: "Node Service Providers",
    layer: "infrastructure",
    status: "draft",
    oneLine: "A gRPC service that streams block templates to miners, who fill in their own z-chain commitment.",
    summary: `<p>A Node Service Provider (NSP) runs proof-of-work chain nodes and serves block templates to miners' clients. The client turns each template into jobs for its own identity, Z-bit and binding by filling in the z-chain commitment (SNP-02).</p>
<p>Every share is a merged note. Every header that is a block goes back to the NSP, which submits it. The coinbase pays the client: an NSP serves templates, not pay, and may keep at most its announced fee.</p>`,
    audience: ["miners", "rig builders", "node operators"],
    depends: ["01", "02", "03"],
    kinds: [
      { kind: 31725, name: "NSP announcement (SNP-03)", how: "signed, addressable; names chains, -aux algorithms, url and fee" },
      { kind: 27235, name: "HTTP Auth (NIP-98)", how: "signed by the client, sent as gRPC metadata on every call" }
    ],
    tags: [],
    sections: [
      {
        id: "transport",
        h: "Transport and auth",
        html: `<p>gRPC over HTTP/2 with TLS, at the announcement's <code>url</code>. The service is <code>snp07.v1.Templates</code>:</p>
<table><thead><tr><th>RPC</th><th>Shape</th><th>Does</th></tr></thead><tbody>
<tr><td><code>WorkStream</code></td><td>WorkRequest → stream Template</td><td>templates for one chain, algorithm and payout, pushed on every change</td></tr>
<tr><td><code>SubmitBlock</code></td><td>BlockSubmission → BlockResult</td><td>a merged note whose header is a block</td></tr>
<tr><td><code>ChainEvents</code></td><td>ChainEventsRequest → stream ChainEvent</td><td>tips connected and disconnected</td></tr>
</tbody></table>
<p>Every call carries <code>authorization: Nostr &lt;base64 event&gt;</code>: a NIP-98 <code>kind:27235</code> event signed by the client, with <code>u</code> = url + <code>/&lt;service&gt;/&lt;method&gt;</code> and <code>method</code> = <code>POST</code>. Requests with a body add NIP-98's <code>payload</code> tag. The NSP may refuse or rate-limit keys. Clients may send keepalive pings every 60 seconds.</p>`
      },
      {
        id: "templates",
        h: "Templates",
        html: `<p><code>WorkRequest</code> names a chain (genesis id), an announced algorithm and the client's <code>payout_script</code>. Each template carries:</p>
<ul>
<li><code>id</code>, unique across all the NSP's streams and never reused; <code>announcement</code>, the 31725 version it is served under;</li>
<li>parent header fields <code>height</code>, <code>version</code>, <code>prev_block</code>, <code>time</code>, <code>bits</code>; <code>version_mask</code>; the client may roll time up to +600 seconds;</li>
<li><code>clean</code>: true when <code>prev_block</code> changed;</li>
<li><code>coinbase_head</code>, <code>coinbase_middle</code>, <code>coinbase_tail</code>, <code>extranonce_size</code> (4 to 16), <code>coinbase_branch</code>;</li>
<li><code>tree_size</code>, <code>merkle_nonce</code>, <code>slot</code>, <code>aux_branch</code>.</li>
</ul>
<p>The coinbase is <code>head ‖ commitment ‖ middle ‖ extranonce ‖ tail</code>. The 44-byte commitment is <code>FA BE 6D 6D</code>, the aux root byte-reversed, tree size and merkle nonce. A new identity, Z-bit or binding needs no new template.</p>`
      },
      {
        id: "nsp-must",
        h: "What the NSP must serve",
        html: `<p>For each template, the NSP must serve:</p>
<ul>
<li>a previous block that is its node's tip;</li>
<li>outputs that pay only the client's <code>payout_script</code>, plus at most one other non-zero output, the NSP's, worth at most <code>fee</code> ppm of all outputs, plus zero-value outputs;</li>
<li>one <code>FA BE 6D 6D</code> in the first input's script, provided by the commitment;</li>
<li>a z-chain <code>slot</code> that differs from every other merged chain's.</li>
</ul>
<p>The NSP fills the other leaves of the aux tree with the chains it merges. An NSP sees the client's blocks first and could withhold one; the client keeps the note and can submit the block elsewhere.</p>`
      },
      {
        id: "client-checks",
        h: "Client checks",
        html: `<p>The client must check every template before mining it, and drop it on any failure:</p>
<ul>
<li><strong>1. Well-formed</strong>: every field has its size, <code>bits</code> encodes a target above zero, and the assembled coinbase parses with the commitment and extra-nonce in the first input's script.</li>
<li><strong>2. Commitment</strong>: the marker occurs only there, <code>tree_size = 2^len(aux_branch)</code>, and <code>slot</code> matches the z-chain's slot for <code>merkle_nonce</code>.</li>
<li><strong>3. Pay</strong>: <code>announcement</code> names the version the client accepted, and the outputs pay as above against that version's <code>fee</code> (at most 1000000). Outputs sum to at most <code>2^64 - 1</code>.</li>
<li><strong>4. Tip</strong>: <code>prev_block</code> is the tip known from <code>ChainEvents</code>, compared after byte-reversing.</li>
</ul>
<p><code>bits</code> is Bitcoin's compact form. A set sign bit, a result over 256 bits, or zero is no target.</p>`
      },
      {
        id: "blocks",
        h: "Blocks",
        html: `<p>A client tests every header against two targets: <code>T(z)</code> for a share and the target of <code>bits</code> for a block. Neither test depends on the other. A header that clears <code>bits</code> but not <code>T(z)</code> is a block but no note.</p>
<p>The client must submit every header that clears <code>bits</code>, whatever its Z-bit, with the template <code>id</code>, at once. Where it picks its own Z-bit, it may lower it so every block is also a share.</p>
<p>The NSP rebuilds the block and submits it, with the AuxPoW of each merged chain. Errors: <code>INVALID_ARGUMENT</code> for a bad record or a header not clearing <code>bits</code>; <code>NOT_FOUND</code> for an unknown or expired template. A block sent again gets its earlier result, kept at least 24 hours.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>From the SNP-07 test vector, on regtest (<code>bits</code> = 545259519, <code>0x207fffff</code>). The NSP announces <code>fee</code> = 10000 ppm (1 %). Template <code>t1</code>, height 42, has <code>tree_size</code> 2, <code>merkle_nonce</code> 3 and <code>slot</code> 1, with one coinbase-branch hash and one aux-branch hash.</p>
<table><thead><tr><th>Output</th><th>Value</th><th>Check 3</th></tr></thead><tbody>
<tr><td>client's <code>payout_script</code></td><td>4,950,000,000</td><td>the client's pay</td></tr>
<tr><td>NSP's script</td><td>50,000,000</td><td>1 % of 5,000,000,000: within <code>fee</code></td></tr>
</tbody></table>
<p>The client builds a job for an <code>8z00</code> <code>sha256d-aux</code> note with a 32-byte binding. It hashes its z-chain header, climbs the aux branch with side mask 1 to the root, writes the 44-byte commitment <code>fabe6d6d…02000000 03000000</code>, adds an 8-byte extra-nonce and mines. On regtest the parent target (<code>7fffff00…</code>) is easier than <code>T(8z00)</code>, so every header that is a note here is also a block. The client sends each block back through <code>SubmitBlock</code>, whether or not it is also a note.</p>`
    },
    tryIt: ["merged", "network"]
  },

  /* ------------------------------------------------------------------ 08 */
  {
    n: "08",
    title: "Ask",
    layer: "infrastructure",
    status: "draft",
    oneLine: "An owner tells its own mining rig what to mine, for how long, and reads back status and hashrate.",
    summary: `<p>An ask is an owner telling its own mining rig what to mine: notes bound to what, how much, and until when. The rig queues it, mines it, reports its state, and returns to its usual work when it ends.</p>
<p>An owner can also request a report of the rig's hashrate and current work. Everything travels gift-wrapped. The notes are ordinary SNP-01 notes, which the owner checks without trusting the rig.</p>`,
    audience: ["rig owners", "miners", "app builders"],
    depends: ["01", "02"],
    kinds: [
      { kind: 1728, name: "Ask", how: "rumor from owner to rig, NIP-59 gift-wrapped" },
      { kind: 1729, name: "Status", how: "rumor from rig to owner, gift-wrapped" },
      { kind: 1730, name: "Report", how: "request and answer rumors, gift-wrapped both ways" }
    ],
    tags: [
      { tag: "d", meaning: "ask id, 64 random hex; required" },
      { tag: "expiration", meaning: "when the ask ends; required" },
      { tag: "b", meaning: "binding hex, empty for unbound; required" },
      { tag: "want", meaning: "total work wanted; default: mine until expiration" },
      { tag: "z", meaning: "Z-bit of each note; default: the rig's share size" },
      { tag: "g", meaning: "algorithm; default: the rig's" },
      { tag: "identity", meaning: "key the notes credit; default: the owner" },
      { tag: "priority", meaning: "order among this owner's asks; default 0" },
      { tag: "relay", meaning: "where notes go; default: the rig's note relays" }
    ],
    sections: [
      {
        id: "roles",
        h: "Owners and rigs",
        html: `<ul>
<li><strong>Owner</strong>: a key allowed to command a rig, configured by the rig's operator with a <strong>rank</strong>.</li>
<li><strong>Rig</strong>: software driving mining hardware, such as a stratum server, under its own key. It needs no owner's key: notes need no signature.</li>
<li><strong>Usual work</strong>: what the rig mines with no ask running, templates from its own node or an NSP, or nothing (<strong>standby</strong>).</li>
</ul>
<p>All messages are NIP-59 gift wraps to the recipient's <code>kind:10050</code> inbox relays. A rig drops, without answering, any message not from one of its owners, and any ask without a valid <code>d</code> or <code>expiration</code>. Relays see neither who commands which rig nor what is asked.</p>`
      },
      {
        id: "the-ask",
        h: "The ask and its versions",
        html: `<p>An ask is <code>(owner, d)</code>. <code>b</code>, <code>g</code> and <code>identity</code> are fixed for the life of an ask; a version changing them is refused with <code>immutable</code>. A rig that mines several algorithms refuses an ask without <code>g</code>.</p>
<p>To update, the owner sends a new rumor with the same <code>d</code>. The rig applies the latest <code>created_at</code>, ties to the larger rumor id, and ignores older ones. To cancel, the owner sends a version whose <code>expiration</code> has passed.</p>
<p>Numbers are decimals without sign or leading zeros, at most <code>2^53 - 1</code>. A bad number makes the ask <code>refused</code> with <code>invalid-tag</code>.</p>`
      },
      {
        id: "lifecycle",
        h: "Lifecycle",
        html: `<table><thead><tr><th>State</th><th>Meaning</th></tr></thead><tbody>
<tr><td><code>queued</code></td><td>valid, waiting for hashrate</td></tr>
<tr><td><code>running</code></td><td>being mined</td></tr>
<tr><td><code>done</code></td><td><code>want</code> reached, or expiration reached with no <code>want</code></td></tr>
<tr><td><code>expired</code></td><td>expiration reached before <code>want</code>, or cancelled</td></tr>
<tr><td><code>failed</code></td><td><code>unavailable</code> or <code>stopped</code> by the operator</td></tr>
<tr><td><code>refused</code></td><td><code>unsupported-algorithm</code>, <code>ambiguous-algorithm</code>, <code>immutable</code>, <code>invalid-tag</code>, <code>queue-full</code>, <code>over-limit</code></td></tr>
</tbody></table>
<p>A version whose <code>want</code> is at or below the progress made ends the ask <code>done</code> at once. Final states stay final. A rig never starts or resumes an expired ask, and drops an ask received already expired.</p>`
      },
      {
        id: "status-and-queue",
        h: "Status and queue",
        html: `<p>A <code>kind:1729</code> status names the ask (<code>d</code>), the version applied (<code>e</code>) and the <code>state</code>. While queued or running it gives the resolved <code>g</code> and <code>z</code>. It adds <code>queue</code> (position, running ask = 1), <code>progress</code> (notes and summed Z-bit), <code>rate</code> and <code>reason</code> as they apply.</p>
<p>The rig keeps one queue, ordered by owner <strong>rank</strong>, then <code>priority</code>, then arrival. <code>priority</code> orders only that owner's asks, so no owner can jump ahead of a higher-ranked one. An arrival ahead of the head preempts it back to <code>queued</code>, progress kept. A rig may bound the queue (<code>queue-full</code>) and how far ahead an expiration may lie (<code>over-limit</code>).</p>`
      },
      {
        id: "report",
        h: "Reports and checking",
        html: `<p>An owner sends a <code>kind:1730</code> request with <code>expiration</code> and optional <code>every</code> (at least 60 seconds). The rig answers once, or at that interval until expiration, with <code>rate</code> per algorithm, <code>workers</code>, one <code>worker</code> tag per miner (name, algorithm, rate, last share), <code>mining</code> (<code>ask</code>, <code>usual</code> or <code>standby</code>), <code>queue</code>, and <code>d</code> only when the running ask is the requester's.</p>
<p>A status is a claim. The owner counts the notes itself with <code>{"kinds":[1723], "authors":[&lt;identity&gt;], "#b":[&lt;b&gt;]}</code>, in <code>g</code>, at least <code>z</code>, each proof once. A rig can only misreport progress and rate, and the rate can be estimated from shares (SNP-02).</p>
<p>For an <code>-aux</code> algorithm on real work, only the z-chain header changes, so the same hashing still mines blocks.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>Alice's rig mines <code>scrypt-aux</code> on its usual work.</p>
<table><thead><tr><th>Ask</th><th>Rig</th></tr></thead><tbody>
<tr><td>A: <code>b</code> = an offer binding, <code>want 20z00</code>, 1 day</td><td><code>queued 1</code>, <code>g scrypt-aux</code>, <code>z 12z00</code>, then <code>running</code></td></tr>
<tr><td>(mining)</td><td>A <code>running</code>, <code>progress 7 14z80</code></td></tr>
<tr><td>B: <code>b</code> = a service epoch, <code>priority 5</code>, 1 hour</td><td>B <code>running</code>; A <code>queued 2</code></td></tr>
<tr><td>(1 hour)</td><td>B <code>done</code>; A <code>running</code></td></tr>
<tr><td>A, newer: <code>want 21z00</code></td><td>A <code>running</code></td></tr>
<tr><td>(mining)</td><td>A <code>running</code>, <code>progress 300 20z22</code></td></tr>
<tr><td>A, newer: <code>want 20z00</code>, below progress</td><td>A <code>done</code>; usual work</td></tr>
<tr><td>A, older version replayed</td><td>ignored</td></tr>
<tr><td>C, received already expired</td><td>dropped</td></tr>
<tr><td>from a key not an owner</td><td>dropped</td></tr>
</tbody></table>
<p>Seven <code>12z00</code> notes are 7 · 2^12 = 28,672, which reads back as <code>14z80</code>.</p>`
    },
    tryIt: ["ask", "planner"]
  },

  /* ------------------------------------------------------------------ 09 */
  {
    n: "09",
    title: "Access Paid in Work",
    layer: "applications",
    status: "draft",
    oneLine: "An HTTP API or MCP server charges per call in work: a 402 with a Z-bit price, paid with bound notes.",
    summary: `<p>A service, an HTTP API or an MCP server, charges for a call in work instead of with an account or an API key. It states a price as a Z-bit. The caller pays with Sharenotes bound to the service's origin and current epoch.</p>
<p>Notes can be mined ahead of time, by the caller or a provider, so paying is instant. Each note is spendable once, at one origin, for two of the service's epochs.</p>`,
    audience: ["API builders", "MCP server authors", "AI agents", "callers"],
    depends: ["01", "02"],
    kinds: [
      { kind: 27235, name: "HTTP Auth (NIP-98)", how: "keyed mode only: sent in the Sharenote-Auth header, signed by the notes' identity" }
    ],
    tags: [],
    sections: [
      {
        id: "overview",
        h: "Overview",
        html: `<table><thead><tr><th>Step</th><th>Who</th><th>Does</th></tr></thead><tbody>
<tr><td>1. Price</td><td>service</td><td>answers an unpaid call with <code>402 Payment Required</code> and its price</td></tr>
<tr><td>2. Mine</td><td>caller or provider</td><td>mines notes bound to the service, ahead of time</td></tr>
<tr><td>3. Pay</td><td>caller</td><td>repeats the call with notes worth at least the price</td></tr>
<tr><td>4. Serve</td><td>service</td><td>checks the notes, records them as spent, serves</td></tr>
</tbody></table>
<p>Notes go straight to the service in a header. They need not be published to relays. Without <code>keyed</code>, a note is a bearer payment: whoever presents it first spends it. So never publish an unkeyed note before spending it.</p>`
      },
      {
        id: "price",
        h: "The price header",
        html: `<p>A <code>402</code> carries <code>Sharenote-Price</code>: one price per accepted algorithm, separated by <code>,</code>; fields <code>key=value</code> separated by <code>;</code>.</p>
<table><thead><tr><th>Field</th><th>Required</th><th>Value</th></tr></thead><tbody>
<tr><td><code>g</code></td><td>yes</td><td>an accepted algorithm</td></tr>
<tr><td><code>z</code></td><td>yes</td><td>the price, a Z-bit</td></tr>
<tr><td><code>epoch</code></td><td>yes</td><td>the epoch to mine for, below 2^32</td></tr>
<tr><td><code>until</code></td><td>yes</td><td>unix time the epoch ends</td></tr>
<tr><td><code>period</code></td><td>yes</td><td>epoch length in seconds, at least 1</td></tr>
<tr><td><code>max</code></td><td>yes</td><td>most notes per call, at least 16</td></tr>
<tr><td><code>size</code></td><td>no</td><td>largest record in bytes, default 256; at least 2048 for an <code>-aux</code> price</td></tr>
<tr><td><code>keyed</code></td><td>no</td><td><code>1</code>: calls must carry a caller proof</td></tr>
<tr><td><code>session</code></td><td>no</td><td>seconds of access one payment buys</td></tr>
</tbody></table>
<p>Service fields are identical in every price. Refusals carry <code>Sharenote-Error</code>: <code>count</code>, <code>size</code>, <code>proof</code>, <code>binding</code>, <code>algorithm</code>, <code>duplicate</code>, <code>spent</code>, <code>amount</code>, <code>caller</code> or <code>session</code>.</p>`
      },
      {
        id: "paying",
        h: "Paying",
        html: `<p>A payment note's <code>binding</code> is exactly 36 bytes:</p>
<pre><code>binding = SHA-256(origin) ‖ epoch (4 bytes, big-endian)</code></pre>
<p>The origin is serialized as in RFC 6454: lowercase scheme and host, default port omitted, for example <code>https://api.example</code>. Only <code>https</code> URLs with a domain-name host are payable; the host is normalized to an IDNA A-label. The caller takes the origin from the URL that returned the 402, never from the response. The service uses its configured public origin, never the <code>Host</code> header.</p>
<p>The caller sends its notes in one <code>Sharenote</code> header: lowercase hex records separated by <code>,</code>, all in one algorithm. Their values add by SNP-01, compared by weight.</p>`
      },
      {
        id: "service-checks",
        h: "Service checks",
        html: `<p>Checks run in order and stop at the first failure. Checks 1 to 9 hash no work.</p>
<table><thead><tr><th>#</th><th>Check</th><th>Refusal</th></tr></thead><tbody>
<tr><td>1</td><td>at most <code>max</code> notes</td><td><code>count</code></td></tr>
<tr><td>2</td><td>each at most 2 · <code>size</code> hex characters</td><td><code>size</code></td></tr>
<tr><td>3</td><td>lowercase hex; SNP-01 record checks 1 to 4</td><td><code>proof</code></td></tr>
<tr><td>4</td><td>binding is SHA-256(origin) and the current or previous epoch</td><td><code>binding</code></td></tr>
<tr><td>5</td><td>one algorithm, and it is priced</td><td><code>algorithm</code></td></tr>
<tr><td>6</td><td>no record twice in the call</td><td><code>duplicate</code></td></tr>
<tr><td>7</td><td>none in the spent-set (keyed by SHA-256 of the record)</td><td><code>spent</code></td></tr>
<tr><td>8</td><td>total weight ≥ <code>w(T(z))</code></td><td><code>amount</code></td></tr>
<tr><td>9</td><td>if keyed: one identity and a valid <code>Sharenote-Auth</code></td><td><code>caller</code></td></tr>
<tr><td>10</td><td>each note's work passes, heaviest first</td><td><code>proof</code></td></tr>
</tbody></table>
<p>On success the service records all notes as spent atomically, then serves. A forged payment costs the service one work hash. Overpayment is not refunded.</p>`
      },
      {
        id: "epochs-sessions",
        h: "Epochs, keyed mode and sessions",
        html: `<p><strong>Epochs.</strong> Epoch <code>e</code> runs from <code>E0 + e · period</code> to <code>until = E0 + (e+1) · period</code>. A service accepts notes for its current and previous epoch only, so its spent-set covers two epochs. The epoch never decreases. After losing spent entries, a service refuses payments until its epoch reaches <code>h + 2</code>. All acceptors at one origin share one spent-set.</p>
<p><strong>Keyed mode.</strong> With <code>keyed=1</code>, all notes share one identity and the call carries <code>Sharenote-Auth</code>: a base64 NIP-98 <code>kind:27235</code> event signed by that identity, whose <code>u</code> is the origin plus the request target and which has one <code>["sharenote", &lt;SHA-256 of the records&gt;]</code> tag. Copied notes become useless.</p>
<p><strong>Sessions.</strong> With <code>session=&lt;seconds&gt;</code>, a payment returns <code>Sharenote-Session: &lt;token&gt;</code>, which covers every charged call for that long. The token is a bearer secret.</p>`
      },
      {
        id: "mcp",
        h: "MCP",
        html: `<p><strong>Over HTTP</strong>, an MCP server uses the same headers. The 402 body is a JSON-RPC error, and the client retries the same request with <code>Sharenote</code>.</p>
<p><strong>Over stdio</strong>, the server runs on the caller's machine, so it forwards notes to a backend that runs the service checks for its own HTTPS origin. The client binds notes to the backend origin in its own configuration, never one the server reports. Without a configured origin, or on a mismatch, it must not pay.</p>
<pre><code>{"code": 402, "message": "Payment Required",
 "data": {"origin": "https://api.example",
          "prices": [{"g": "sha256d", "z": "20z00", "epoch": 7,
                      "until": 1731003600, "period": 3600, "max": 16}]}}</code></pre>
<p>The client retries with <code>params._meta.sharenote</code>, an array of hex records. Keyed mode and sessions are HTTP-only.</p>`
      }
    ],
    example: {
      title: "Worked example",
      html: `<p>A service at <code>https://api.example</code> charges <code>12z00</code> in <code>sha256d</code>, epoch 7, not keyed:</p>
<pre><code>Sharenote-Price: g=sha256d;z=12z00;epoch=7;until=1731003600;period=3600;max=16</code></pre>
<p>Its payment binding is <code>SHA-256("https://api.example") ‖ 00000007</code>:</p>
<pre><code>e91cdb47052c095bd090354d5fe4d27c857def7e585248d963ca1d895232f667 00000007</code></pre>
<p>Alice's provider has mined three notes credited to her with that binding, without her key: one <code>12z00</code> and two <code>11z00</code>.</p>
<table><thead><tr><th>Call</th><th>Answer</th></tr></thead><tbody>
<tr><td>no payment</td><td><code>402</code>, the price</td></tr>
<tr><td>the <code>12z00</code> note</td><td>served</td></tr>
<tr><td>the same note again</td><td><code>402</code>, <code>spent</code>, no work hash</td></tr>
<tr><td>both <code>11z00</code> notes (2^11 + 2^11 = 2^12)</td><td>served</td></tr>
<tr><td>a fresh <code>11z00</code> alone</td><td><code>402</code>, <code>amount</code></td></tr>
<tr><td>the same note twice in one header</td><td><code>402</code>, <code>duplicate</code></td></tr>
<tr><td>a note mined for another origin</td><td><code>402</code>, <code>binding</code></td></tr>
<tr><td>a note for epoch 7, once the epoch is 9</td><td><code>402</code>, <code>binding</code></td></tr>
</tbody></table>`
    },
    tryIt: ["access", "buy", "mint"]
  }
];

/* -------------------------------------------------------------- glossary */
window.SN_GLOSSARY = [
  { term: "Algorithm", def: "The proof-of-work function a note is measured in: sha256d or scrypt, plus sha256d-aux and scrypt-aux for merged notes. Values compare and add only within one algorithm.", snp: "01" },
  { term: "Announcement", def: "An addressable Nostr event a key publishes so others can find it: a provider (31724), an NSP (31725) or a pay destination (31726). The newest valid version is the one in effect.", snp: "03" },
  { term: "Ask", def: "A gift-wrapped kind:1728 command from an owner to its own rig: what binding to mine, how much and until when. The rig queues it and reports statuses.", snp: "08" },
  { term: "ATTRIBUTED", def: "The verdict for a valid note: it is worth exactly its Z-bit and credited to its identity. Only ATTRIBUTED notes count.", snp: "01" },
  { term: "Aux merkle tree", def: "A merkle tree whose root sits in the parent coinbase; each leaf belongs to one merged chain. The z-chain takes the slot computed from chain id 0x534E.", snp: "02" },
  { term: "Binding", def: "An optional opaque value committed inside a note that scopes it to one use, such as an offer, a reaction or a service epoch. It cannot be changed without redoing the work.", snp: "01" },
  { term: "Block", def: "A parent header that clears the parent chain's own target. A client must submit every block it finds, whether or not it is also a share.", snp: "07" },
  { term: "Caller proof", def: "In keyed mode, a NIP-98 event signed by the notes' identity and sent in the Sharenote-Auth header. It ties the payment to one call so copied notes are useless.", snp: "09" },
  { term: "Contribution", def: "The total weight of a worker's notes that answer an offer, each proof counted once. Anyone can recompute it from the offer's relays.", snp: "04" },
  { term: "Cutoff", def: "When an issuer stopped counting notes for a receipt: the offer's closes, else the receipt's closed tag, else its created_at. It is fixed once a receipt is published.", snp: "05" },
  { term: "Epoch", def: "A fixed-length time window of an access-paid service. Payment notes bind to one epoch and are accepted only in that epoch and the next.", snp: "09" },
  { term: "Equivocation", def: "Two receipts for one offer that differ in reward, pay, notes or cutoff. Both signed receipts together prove the issuer contradicted itself.", snp: "05" },
  { term: "Gift wrap", def: "The NIP-59 envelope used for orders, quotes, statuses, asks and reports. Relays see a wrap addressed to someone, not who sent it or what it says.", snp: "06" },
  { term: "Identity", def: "The x-only Nostr public key inside a note's record that the work is credited to. Changing it changes the hash and needs fresh work.", snp: "01" },
  { term: "Keyed mode", def: "A service setting (keyed=1) that requires every payment to carry a caller proof from the notes' identity, so a stolen note cannot be spent by someone else.", snp: "09" },
  { term: "Late note", def: "A note that answers an offer but was not known on its relays before the receipt's cutoff. Leaving it out of a receipt is nothing against the issuer.", snp: "05" },
  { term: "Merged note", def: "A Sharenote whose work is a parent chain header's proof-of-work hash, committed in that header's coinbase under the z-chain slot. Every share becomes one.", snp: "02" },
  { term: "Minter", def: "The identity credited with a note's work. The minter need not do the hashing: a provider can mine notes credited to it.", snp: "01" },
  { term: "Nonce", def: "The only record field changed while mining. In a merged note it holds the proof linking the parent header to the commitment.", snp: "01" },
  { term: "NSP", def: "Node Service Provider: runs chain nodes and streams block templates over gRPC so miners can merge-mine notes. The coinbase pays the miner, minus at most the announced fee.", snp: "07" },
  { term: "Omission", def: "A note that answers an offer and was on its relays before the cutoff, but is missing from the receipt. Whoever holds it can name it by its key.", snp: "05" },
  { term: "Order", def: "A gift-wrapped kind:1724 request to a provider for a count of notes of one Z-bit, credited to an identity and bound to a binding.", snp: "06" },
  { term: "Owner", def: "A key allowed to send asks to a rig, set by the rig's operator with a rank. It need not be the identity the notes credit.", snp: "08" },
  { term: "Parent chain", def: "The SHA-256d or scrypt proof-of-work chain a miner secures. Its work is reused as-is to mint merged notes, and it needs no change.", snp: "02" },
  { term: "Pay announcement", def: "A kind:31726 event, signed by the identity notes credit, listing where to pay it on one chain or over Lightning. No one else can redirect its pay.", snp: "03" },
  { term: "Price", def: "What a service charges per call, as a Z-bit per algorithm, sent in the Sharenote-Price header of a 402 response.", snp: "09" },
  { term: "Proof hash (H)", def: "The hash of a note's record, or of the parent header for a merged note. It must be at most the target. Together with the algorithm it identifies the note; it is never its value.", snp: "01" },
  { term: "Provider", def: "A key that mines Sharenotes on someone else's behalf. It is found by its kind:31724 announcement and takes gift-wrapped orders paid over Lightning.", snp: "06" },
  { term: "Quote", def: "A provider's kind:1725 answer to an order: one BOLT11 invoice with an expiration, never above the announced price cap.", snp: "06" },
  { term: "Rank", def: "A rig's per-owner setting that orders its queue before priority, so no owner can jump ahead of a higher-ranked one.", snp: "08" },
  { term: "Receipt", def: "A signed kind:1727 event listing who gets how much of an offer's reward and exactly which notes were counted.", snp: "05" },
  { term: "REJECT", def: "The verdict for a malformed note, a mismatched event, or a note without enough work. Relays drop it and consumers ignore it.", snp: "01" },
  { term: "Rig", def: "Software driving mining hardware under its own key, such as a stratum server. It mines asks from its owners and otherwise does its usual work.", snp: "08" },
  { term: "Session", def: "An optional access window bought by one payment. The service returns a Sharenote-Session token that covers every charged call for that many seconds.", snp: "09" },
  { term: "Share", def: "A parent header whose hash clears a merged note's target. It is also a block only if it clears the parent chain's far harder target.", snp: "02" },
  { term: "Sharenote", def: "A proof of energy: a self-verifying record showing that one identity spent a declared amount of work in a stated algorithm. No one issues it and anyone can check it.", snp: "01" },
  { term: "SKIP", def: "The verdict for a note with an unknown version or algorithm. The verifier cannot evaluate it, so it neither counts nor stores it.", snp: "01" },
  { term: "SN4U record", def: "The binary layout of a note: the tag SN4U, version, algorithm, identity, Z-bit, binding and nonce. The proof is computed over these exact bytes.", snp: "01" },
  { term: "Spent-set", def: "The record of notes a service has already accepted, keyed by the SHA-256 of each record. It covers two epochs and is shared by every acceptor at one origin.", snp: "09" },
  { term: "Target", def: "The 256-bit number a Z-bit maps to exactly. A note is valid when its proof hash is at most the target; a smaller target means more work.", snp: "01" },
  { term: "Template", def: "In an offer, the opaque content notes commit to through the offer id. In SNP-07, a block template an NSP streams for miners to build jobs on.", snp: "04" },
  { term: "Unbound", def: "A note with an empty binding. It is prepaid energy that can be shown anywhere it is accepted, but it can never be shown to be fresh work.", snp: "01" },
  { term: "Usual work", def: "What a rig mines with no ask running: templates from its own node or an NSP, or nothing at all (standby).", snp: "08" },
  { term: "Value", def: "What a note is worth: D = 2^256 / T, the expected number of hashes to find it. It comes from the committed Z-bit, never from the hash.", snp: "01" },
  { term: "Weight", def: "A note's value scaled by 2^128 as an integer, w = floor(2^384 / T). Sums, comparisons and reward splits all use weights.", snp: "01" },
  { term: "Withdrawal", def: "A NIP-09 deletion naming an announcement's address. It removes every version up to its own time; jobs and receipts that named a version still stand.", snp: "03" },
  { term: "Work offer", def: "A signed kind:1726 event asking for work in one algorithm toward a template, with a minimum Z-bit and optionally a reward and close time.", snp: "04" },
  { term: "Z-bit", def: "The denomination of a note, written NNzcc: whole bits, a lowercase z, two centi-bit digits. 34z10 is 34.10 Z-bits; each whole bit doubles the work.", snp: "01" },
  { term: "Z-chain", def: "The aux merkle tree leaf, chain id 0x534E (\"SN\"), under which merged notes are committed. It is a single slot, not a chain of linked blocks.", snp: "02" }
].sort(function (a, b) { return a.term.toLowerCase().localeCompare(b.term.toLowerCase()); });

/* --------------------------------------------------------------- retired */
window.SN_RETIRED = [
  { old: "NIP-SN", now: "SNP-01 Proof of Energy", note: "The original core spec, \"Sharenote: Proof-of-Work Bearer Notes\" (v0.1.0), was redesigned and renamed SNP-01." },
  { old: "Sharenote Profiles", now: "Sharenote Proposals (SNP)", note: "The core-plus-profiles family became one layered series of peer specs, the Sharenote analogue of Nostr's NIPs." },
  { old: "SNIP-00 Core Math", now: "SNP-01 §Z-Arithmetic", note: "Z-bit to target, value, exact sums and splits now live in SNP-01, with integer weights instead of floats." },
  { old: "SNIP-02 Hashrate & Telemetry (kind 35502)", now: "Retired", note: "Hashrate is estimated from public shares (SNP-02 §Hashrate from shares); an owner can request a private rig report (SNP-08, kind 1730)." },
  { old: "SNIP-03 Pool Accounting (kinds 35500, 35501, 35503–35505)", now: "SNP-04 Work Offer + SNP-05 Payout Receipts", note: "Block invoices and miner share events became an offer (kind 1726) and an auditable receipt (kind 1727)." },
  { old: "SNIP-04 Raw Printing & AuxPoW (kind 35510)", now: "SNP-02 Z-Chain", note: "A merged note is an ordinary kind 1723 note whose nonce carries the AuxPoW proof." },
  { old: "SNIP-05 Miner & Pool Identity (kinds 10520, 10521)", now: "SNP-03 Announcement", note: "Identity and pool profile events became provider (31724), NSP (31725) and pay (31726) announcements." },
  { old: "SNP-10 Z-Chain", now: "SNP-02", note: "Renumbered 2026-11-14 so each spec depends only on lower numbers. Its pools section was removed." },
  { old: "SNP-02 Announcement", now: "SNP-03", note: "Renumbered 2026-11-14. Earlier, number 02 held Identity, then briefly Mining Providers (now SNP-06)." },
  { old: "SNP-03 Work Offer", now: "SNP-04", note: "Renumbered 2026-11-14. Kind 1726 unchanged." },
  { old: "SNP-04 Payout Receipts", now: "SNP-05", note: "Renumbered 2026-11-14. Kind 1727 unchanged. Before the 2026-11-13 redesign it was the Accounting profile." },
  { old: "SNP-13 Access Paid in Work", now: "SNP-09", note: "Renumbered 2026-11-14. Same rules: HTTP 402, Sharenote header, origin and epoch binding, keyed mode, MCP." },
  { old: "SNP-05 Telemetry (kind 20500)", now: "Retired", note: "Hashrate comes from public shares; monitoring is internal to the rig, and the SNP-08 report is owner-only." },
  { old: "SNP-11 Engagement Backed by Work (kind 31723 tally)", now: "Retired", note: "A like backed by work is a note bound to the reaction (SNP-01); work on a post's reactions is counted by an SNP-04 offer with target + via 7." },
  { old: "SNP-12 Mint Paid in Work (drops 1724, grants 1725)", now: "Retired", note: "Out of the series' focus; a sale can still be a note's binding. Kinds 1724 and 1725 are now SNP-06 order and quote." },
  { old: "SNP-07 Work Givers (work announcement 31725)", now: "SNP-07 Node Service Providers", note: "The work endpoint became a gRPC template service; kind 31725 is now the NSP announcement." },
  { old: "Kinds 1733, 1734, 1735", now: "Kinds 1723, 1726, 1727", note: "The redesign's Sharenote, Work Offer and Accounting kinds; now note, offer and receipt." },
  { old: "Kind 10500 Identity", now: "SNP-03 announcements", note: "The redesign-era Identity kind is gone; a key announces its roles and pay destinations in SNP-03 instead." },
  { old: "Kind 11723 provider announcement", now: "Kind 31724", note: "Provider announcements became addressable (one per d value) and moved into SNP-03." },
  { old: "SNOT record", now: "SN4U record", note: "The binary record tag is SN4U (53 4E 34 55), with length-prefixed algorithm, binding and nonce." },
  { old: "UNATTRIBUTED verdict", now: "ATTRIBUTED / REJECT / SKIP", note: "Every note commits its identity, so there is no unattributed tier. Operator-signed custodial mode was dropped." },
  { old: "sha256d-btcheader, sha256d-btcheader-id", now: "sha256d-aux, scrypt-aux", note: "Header-class notes became merged notes with a full AuxPoW proof under the z-chain slot." },
  { old: "Uppercase NNZcc labels (e.g. 34Z10)", now: "Lowercase NNzcc (34z10)", note: "The z tag and every display use a lowercase z with two centi-bit digits." },
  { old: "Value from H (D = 2^256 / H), Continuous Difficulty", now: "Value from the committed Z-bit", note: "A note is worth exactly its denomination, D = 2^256 / T; a lucky hash earns no bonus. Math is exact integer weights, never floats." },
  { old: "Watchtower", now: "Auditor / consumer", note: "Anyone re-verifies notes from relays; SNP-05 defines what an auditor can prove about a receipt, and that completeness is never provable." },
  { old: "Pool Alliance", now: "No equivalent", note: "There are no pools in the stack. Several merged chains can share one aux merkle tree (SNP-02)." },
  { old: "Sharenote Bill, Target Bill", now: "Z-bit (denomination)", note: "The Z-bit committed in the record is the note's denomination and its value." },
  { old: "Physical Share", now: "Share", note: "A parent header that clears a merged note's target (SNP-02)." },
  { old: "Hashrate Provider, \"the Market\", routing scopes, printing", now: "Provider (SNP-06), NSP (SNP-07), minting", note: "There is no market layer. Apps order notes from providers; miners get templates from NSPs; a note is minted." },
  { old: "usually_90 / almost_999 planner presets", now: "Not part of any SNP", note: "The current specs give expected work (D = 2^256 / T) and the 1/√n spread of share counts (SNP-02); planners derive their own estimates." }
];

/* ------------------------------------------------------------------- faq */
window.SN_FAQ = [
  {
    q: "Is a Sharenote a token or a coin?",
    a: `<p>No. A Sharenote is a proof that work was done. It has no issuer, no supply and no ledger. The protocol does not even stop a note being shown many times: it is evidence, not cash.</p>
<p>What a note is worth, and what you accept it for, is your application's choice. An app that needs single use binds notes to itself and remembers which ones it has accepted.</p>`
  },
  {
    q: "Who issues notes?",
    a: `<p>Nobody. Anyone who does the work mints a note, and anyone can check it from the record alone. The record commits the identity, algorithm, Z-bit and binding, and the hash proves the work over all of them.</p>
<p>The identity credited need not be the one hashing. A provider (SNP-06) or your own rig (SNP-08) can mine notes credited to you.</p>`
  },
  {
    q: "Why is there no signature?",
    a: `<p>The work is the credential. Your public key sits inside the hashed record, so moving the credit to another key means redoing the work. A signature would add nothing to that.</p>
<p>Leaving it out means a provider can mine notes for you without ever holding your key. It also means the event's pubkey says "credited to", never "written by". Clients must not show a note as authored by that key.</p>`
  },
  {
    q: "What is a Z-bit?",
    a: `<p>The Z-bit is a note's denomination, written like <code>34z10</code>: 34 whole bits, a lowercase <code>z</code>, then 10 centi-bits. Each whole bit doubles the work. <code>20z00</code> is about a million hashes (2^20).</p>
<p>Z-bits are logarithmic, so you never add the labels. You add the values: <code>1z00 + 2z00</code> is 2 + 4 = 6, which reads back as <code>2z58</code>.</p>`
  },
  {
    q: "What does a note cost, and what is it worth?",
    a: `<p>Its cost is the energy to find a hash under the target: on average <code>2^256 / T</code> hashes. Its value in the protocol is exactly that number for its committed Z-bit. A lucky hash earns no bonus.</p>
<p>Any price in money is set by the parties. A provider may announce, say, 1 sat per <code>16z00</code> note; SNP-06 then caps what any order may cost.</p>`
  },
  {
    q: "Can I mine on a phone?",
    a: `<p>Yes, for small notes: a phone can hash a low Z-bit note itself, and the note is checked like any other. For larger notes, a phone usually orders them from a provider (SNP-06): it names the identity, binding and Z-bit, pays a Lightning invoice and checks every note delivered.</p>
<p>The provider never needs your key, and you can mine notes ahead of time so paying later is instant.</p>`
  },
  {
    q: "How do relays prevent spam?",
    a: `<p>A relay that supports SNP-01 stores a <code>kind:1723</code> note only after the record verifies: right format, known algorithm, and enough work. Fake work is dropped at the door. A relay may also cap record size and drop a note it already stores.</p>
<p>Readers still re-check every note. Tags are hints; the record is authoritative.</p>`
  },
  {
    q: "Is Sharenote a mining pool?",
    a: `<p>No. There are no pools in the protocol. A miner can merge-mine notes solo from its own node (SNP-02), or take block templates from a Node Service Provider (SNP-07) whose coinbase pays the miner directly.</p>
<p>Shared rewards use a work offer (SNP-04) and an auditable receipt (SNP-05), split by exact weights anyone can recompute.</p>`
  },
  {
    q: "How do AI agents pay with work?",
    a: `<p>A service answers an unpaid call with <code>402</code> and a <code>Sharenote-Price</code> header (SNP-09). The agent repeats the call with notes bound to that service's origin and current epoch. No account and no API key are needed.</p>
<p>The same works for MCP servers, over HTTP or stdio. The agent can hold prepaid notes mined by a provider, and use keyed mode if it does not trust everyone on the path.</p>`
  },
  {
    q: "Which chains support merged notes?",
    a: `<p>Any proof-of-work chain mined with SHA-256d or scrypt and an 80-byte Bitcoin-style header, through the algorithms <code>sha256d-aux</code> and <code>scrypt-aux</code>. The parent chain needs no change: the note sits in the coinbase's aux merkle tree under chain id <code>0x534E</code>.</p>
<p>The <code>scrypt-aux</code> design was proven against a Flokicoin regtest node. Which chains an NSP serves is in its <code>kind:31725</code> announcement.</p>`
  },
  {
    q: "Can someone steal or reuse my notes?",
    a: `<p>Nobody can move the credit: it is inside the hash. But a copy of a note can be shown again, and an unkeyed payment note is spent by whoever presents it first.</p>
<p>Within one sum a note counts once. For single use, bind notes to one ask and remember spent proofs. For payments, use keyed mode (SNP-09), which requires a signature from the credited identity.</p>`
  },
  {
    q: "Is any of this stable?",
    a: `<p>No. All nine Sharenote Proposals are <code>draft</code>. Kinds, tags and rules may still change. Test vectors for every SNP live in the specs repository and are re-checked by <code>vectors/check.py</code>.</p>
<p>Build against them, pin the version you use, and expect breaking changes before a release.</p>`
  }
];

/* ----------------------------------------------------------------- learn */
window.SN_LEARN = {
  note: {
    title: "What is a Sharenote?",
    lede: "A Sharenote is a small record that proves one identity spent a declared amount of computational work.",
    html: `<h3>A proof of energy</h3>
<p>Many apps want to treat effort as something real: rank a feed by it, gate an API with it, split a reward by it. They all need the same thing: a unit of work that anyone can check and nobody has to issue. A Sharenote is that unit.</p>
<p>A note is a compact binary record. It names an algorithm, an identity, a Z-bit and an optional binding, then a nonce. The minter changes only the nonce until the record's hash falls under the target for its Z-bit. Anyone can rehash the bytes and see that it does.</p>
<h3>A called shot</h3>
<p>Before searching, the minter commits to everything except the nonce. That has three effects:</p>
<ul>
<li><strong>It is worth exactly its Z-bit.</strong> A lucky hash far below the target earns no bonus.</li>
<li><strong>Its credit cannot move.</strong> The identity is inside the hash. Claiming the work for another key changes the hash and needs new work.</li>
<li><strong>It needs no signature.</strong> The work over the identity is the credential, so a provider can mine notes credited to you without your key.</li>
</ul>
<h3>The record</h3>
<table><thead><tr><th>Field</th><th>Example</th></tr></thead><tbody>
<tr><td>tag, version</td><td><code>SN4U</code>, 1</td></tr>
<tr><td>algorithm</td><td><code>sha256d</code></td></tr>
<tr><td>identity</td><td>your 32-byte Nostr public key</td></tr>
<tr><td>Z-bit</td><td><code>20z00</code></td></tr>
<tr><td>binding</td><td>empty, or what the note is for</td></tr>
<tr><td>nonce</td><td>found by mining</td></tr>
</tbody></table>
<h3>How notes travel</h3>
<p>Notes ride on Nostr relays as <code>kind:1723</code> events. The event is unsigned: its pubkey is the record's identity and its content is the record in hex. It carries only three tags, <code>g</code>, <code>z</code> and <code>b</code>, copied from the record so relays can filter.</p>
<p>A relay that supports Sharenotes stores a note only after it verifies. Readers verify again anyway. Each note gets one of three verdicts: <strong>ATTRIBUTED</strong> (valid, counted), <strong>REJECT</strong> (malformed or not enough work) or <strong>SKIP</strong> (unknown version or algorithm).</p>
<h3>What a note is not</h3>
<p>A note is evidence, not cash. The protocol does not stop it being shown many times, does not prove when it was made, and does not move money. Those are application choices. An app that wants single use binds notes to itself and remembers the proofs it has accepted. Everything about a note is public, so if you want your uses unlinkable, mint a fresh note for each one.</p>`
  },
  zbit: {
    title: "Z-bits and exact math",
    lede: "The Z-bit is the denomination every note is minted, counted and priced in, on one continuous scale.",
    html: `<h3>Reading a Z-bit</h3>
<p>A Z-bit is written <code>NNzcc</code>: whole bits, a lowercase <code>z</code>, then two centi-bit digits. <code>34z10</code> means 34.10 bits. Each whole bit doubles the work. Each centi-bit adds a further factor of 2^(1/100).</p>
<table><thead><tr><th>Z-bit</th><th>Expected hashes</th></tr></thead><tbody>
<tr><td><code>10z00</code></td><td>2^10 ≈ a thousand</td></tr>
<tr><td><code>20z00</code></td><td>2^20 ≈ a million</td></tr>
<tr><td><code>30z00</code></td><td>2^30 ≈ a billion</td></tr>
</tbody></table>
<h3>Three quantities</h3>
<p>Every note moves through three numbers:</p>
<ul>
<li><strong>Z-bit</strong>: what people read and price in, like <code>20z00</code>.</li>
<li><strong>Target T</strong>: the number the hash must not exceed. <code>20z00</code> maps to exactly 2^236.</li>
<li><strong>Value D = 2^256 / T</strong>: the expected number of hashes, the work the note represents.</li>
</ul>
<p>The map from Z-bit to target uses a fixed table of 100 integer scale factors, so every implementation agrees to the last bit. No floating point is ever involved. Code carries the <strong>weight</strong>, <code>w = floor(2^384 / T)</code>, which is the value scaled up so it stays an integer.</p>
<h3>Adding notes</h3>
<p>Values add; labels do not. To combine notes, add their weights and read the total back as a Z-bit.</p>
<table><thead><tr><th>Sum</th><th>Result</th></tr></thead><tbody>
<tr><td><code>20z00 + 20z00</code></td><td><code>21z00</code>: double the work is one more bit</td></tr>
<tr><td><code>1z00 + 2z00</code></td><td><code>2z58</code>: 2 + 4 = 6, and log2 6 ≈ 2.58</td></tr>
<tr><td><code>2z01 + 2z01</code></td><td><code>3z00</code>: targets round down</td></tr>
</tbody></table>
<p>Because read-back labels are rounded, compare amounts by weight, never by label. Three rules keep sums honest: only one algorithm per sum, each proof counted once however many events carry it, and no floats.</p>
<h3>Splitting a reward</h3>
<p>When a reward is shared by work, everyone must get the same answer. Each recipient gets the floor of its share. The few leftover units go one each to the largest remainders, with ties to the smallest proof hash.</p>
<p>Example: 10 units between a <code>1z00</code> note (value 2) and a <code>2z00</code> note (value 4). The floors are 3 and 6, leaving 1 unit. The <code>2z00</code> note has the larger remainder, so the result is <strong>3 and 7</strong>.</p>
<h3>One algorithm at a time</h3>
<p><code>34z10</code> in <code>sha256d</code> is not <code>34z10</code> in <code>scrypt</code>, just as $10 is not ¥10. Notes in different algorithms are never added together.</p>`
  },
  bindings: {
    title: "Bindings: what work is for",
    lede: "A binding is a value committed inside a note that says what the work was done for.",
    html: `<h3>Raw work becomes a use</h3>
<p>A note without a binding is just energy. The binding scopes it. Because the binding is inside the hashed record, it cannot be changed after mining without redoing the work. The protocol treats it as opaque bytes; the application decides what it commits.</p>
<table><thead><tr><th>Binding commits</th><th>The note becomes</th></tr></thead><tbody>
<tr><td>nothing</td><td>prepaid energy: mine now, spend later wherever accepted</td></tr>
<tr><td>your own reaction event</td><td>a like backed by work that bots cannot fake cheaply</td></tr>
<tr><td>a service and its epoch</td><td>access paid in work, spent once at that service</td></tr>
<tr><td>a work offer</td><td>work that earns a share of a reward</td></tr>
<tr><td>a sale</td><td>a bid in that sale</td></tr>
</tbody></table>
<h3>Finding the work behind something</h3>
<p>A bound note carries a <code>b</code> tag with the binding in hex. To see the energy behind a binding, query relays for <code>kind:1723</code> with that <code>#b</code> value, verify each note, and add their weights per algorithm. Count each proof once: the same note can be republished in many events.</p>
<h3>Work offers</h3>
<p>An issuer publishes a work offer (SNP-04) naming an algorithm, a minimum Z-bit and a template. Workers bind their notes to the offer's id, so the work is tied to that exact template forever. An offer can also reward work bound to an existing event (<code>target</code>), or to signed events of a given kind that reference it (<code>via</code>). With <code>via</code> = <code>7</code>, it counts the work behind reactions to a post.</p>
<p>If the offer has a reward, the issuer splits it by contribution and publishes a receipt (SNP-05) listing every note it counted. Anyone can check the amounts, and anyone holding a missing note can name the omission.</p>
<h3>Service epochs</h3>
<p>For access paid in work (SNP-09), the binding is <code>SHA-256(origin)</code> followed by a 4-byte epoch number. A note bound this way pays only at that origin, and only during that epoch and the next. The service keeps a spent-set, so each note pays once.</p>
<h3>Fresh or reused</h3>
<p>Unbound notes are convenient, but they can be shown in many places, and those uses link back to one identity. An unbound note can also never be shown to be fresh work: it might have existed before. When fresh work matters, use a binding nobody has used before. When privacy matters, mint a fresh note for each use.</p>`
  },
  merged: {
    title: "Merged notes",
    lede: "A miner securing a SHA-256d or scrypt chain can turn every share into a Sharenote with no extra hashing.",
    html: `<h3>Reusing work that is already done</h3>
<p>Miners already hash parent chain headers all day. Almost none of those hashes become blocks, but many clear a much easier target. SNP-02 makes each of those shares an attributed note. The parent chain needs no change.</p>
<h3>How it fits in the coinbase</h3>
<p>The miner builds a <strong>z-chain header</strong>: an ordinary note record with an empty nonce, naming the algorithm (<code>sha256d-aux</code> or <code>scrypt-aux</code>), the identity, the Z-bit and the binding. Its double SHA-256 is the <strong>z-chain hash</strong>.</p>
<p>That hash becomes a leaf of an aux merkle tree, at the slot computed from chain id <code>0x534E</code> ("SN"). The tree's root goes into the coinbase after the marker <code>FA BE 6D 6D</code>, together with the tree size and a merkle nonce. Other merged chains can fill the other leaves.</p>
<h3>The proof</h3>
<p>When a header's hash clears the note's target, the miner fills the note's nonce with the proof: the 80-byte header, the coinbase, the branch from the coinbase to the header's merkle root, the branch from the leaf to the aux root, and a side mask. A verifier climbs both branches and compares the header's hash with the target.</p>
<table><thead><tr><th>Header hash clears</th><th>Result</th></tr></thead><tbody>
<tr><td>the note's target only</td><td>a share: a valid note, not a block</td></tr>
<tr><td>the parent target too</td><td>a share and a block</td></tr>
<tr><td>the parent target only</td><td>a block, no note (possible on regtest)</td></tr>
</tbody></table>
<h3>One header, one note</h3>
<p>Three locks stop the same work being credited twice: the marker occurs exactly once, the tree size must match the branch length, and the side mask must equal the z-chain's slot. Changing the identity, Z-bit or binding changes the z-chain hash, which the coinbase no longer commits. So a share cannot be re-claimed or pointed at another offer.</p>
<h3>Where templates come from</h3>
<p>A solo miner builds the commitment from its own node. Others take templates from a Node Service Provider (SNP-07), which streams them over gRPC. The client fills in its own commitment, the coinbase pays the client, and the NSP keeps at most its announced fee. Every block goes back to the NSP to submit.</p>
<h3>Public hashrate</h3>
<p>Every share is a public note, so anyone watching the parent chain can estimate a miner's hashrate: add <code>2^256 / T</code> for each share since a known block and divide by the seconds elapsed. With 100 shares the estimate is good to about ±10 %. Withholding shares only lowers it.</p>`
  },
  access: {
    title: "Access paid in work",
    lede: "An API or MCP server can charge per call in work, with no account and no API key.",
    html: `<h3>The flow</h3>
<p>A service states its price as a Z-bit. You pay with Sharenotes bound to that service. The four steps:</p>
<table><thead><tr><th>Step</th><th>What happens</th></tr></thead><tbody>
<tr><td>Price</td><td>an unpaid call gets <code>402 Payment Required</code> and a <code>Sharenote-Price</code> header</td></tr>
<tr><td>Mine</td><td>you or a provider mine notes bound to the service, ahead of time</td></tr>
<tr><td>Pay</td><td>you repeat the call with the notes in a <code>Sharenote</code> header</td></tr>
<tr><td>Serve</td><td>the service checks them, marks them spent and serves</td></tr>
</tbody></table>
<h3>Reading a price</h3>
<pre><code>Sharenote-Price: g=sha256d;z=12z00;epoch=7;until=1731003600;period=3600;max=16</code></pre>
<p>This says: pay <code>12z00</code> of <code>sha256d</code> work, bound to epoch 7, which ends at that unix time. Epochs last an hour. At most 16 notes per call.</p>
<h3>The binding</h3>
<p>A payment note's binding is <code>SHA-256(origin)</code> followed by the epoch as 4 bytes. The origin is the scheme and host, like <code>https://api.example</code>, taken from the URL you called, never from the response. So a note pays only the service you chose. It is accepted in its own epoch and the next one, which lets you mine ahead.</p>
<h3>Paying with several notes</h3>
<p>Notes add by weight. Two <code>11z00</code> notes are 2^11 + 2^11 = 2^12, exactly a <code>12z00</code> price. A single <code>11z00</code> note is refused with <code>amount</code>. Value above the price is not refunded.</p>
<h3>Cheap refusals</h3>
<p>The service runs ten checks in order. The first nine hash no work: count, size, format, binding, algorithm, duplicates, the spent-set, the amount and the caller proof. Only then does it check each note's work. A replayed, duplicated, underpaying or oversized payment costs the service almost nothing.</p>
<h3>Keyed mode</h3>
<p>Without it, a note is a bearer payment: whoever presents it first spends it. That includes the provider that mined it and any proxy that sees it. With <code>keyed=1</code>, all notes must share one identity and the call carries a NIP-98 event signed by that identity, covering this exact request and these exact notes. A copied note is then useless.</p>
<h3>Sessions and MCP</h3>
<p>A service can sell a session: one payment returns a token that covers every call for a set number of seconds. MCP servers use the same headers over HTTP. Over stdio, the client binds notes to the backend origin in its own configuration, never one the server reports, and refuses to pay without one.</p>
<p>For AI agents this means a wallet of prepaid notes replaces a pile of API keys. Mine or order notes for the services you use, and pay each call as it comes.</p>`
  }
};
