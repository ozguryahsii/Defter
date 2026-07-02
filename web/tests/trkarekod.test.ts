import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFastKarekod, crc16ccitt } from "../lib/trkarekod";

// Minimal TLV reader for assertions (2-digit tag + 2-digit length).
function parseTlv(s: string): Map<string, string> {
  const out = new Map<string, string>();
  let i = 0;
  while (i + 4 <= s.length) {
    const tag = s.slice(i, i + 2);
    const len = parseInt(s.slice(i + 2, i + 4), 10);
    out.set(tag, s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return out;
}

test("crc16ccitt matches the official EMVCo QRCPS example vector", () => {
  const payload =
    "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A011223344998877070812345678" +
    "6304";
  assert.equal(crc16ccitt(payload), "A13A");
});

test("payload mirrors the bank TR Karekod layout (with amount)", () => {
  const iban = "TR610006400000110117102293"; // bank code 00064
  const qr = buildFastKarekod({ iban, name: "Hüsnü Apak", amount: 2000 });
  const fields = parseTlv(qr);

  assert.equal(fields.get("75"), "10", "header 7502 10");
  assert.equal(fields.get("01"), "11", "initiation 11");
  assert.equal(fields.get("02"), "0064", "participant code from IBAN");
  assert.match(fields.get("03") ?? "", /^\d{12}$/, "12-digit reference");
  assert.equal(fields.get("54"), "000000200000", "2000 TRY as 12-digit kuruş");
  assert.match(fields.get("20") ?? "", /^[0-9a-f]{32}$/, "32-hex unique id");
  assert.match(fields.get("63") ?? "", /^[0-9A-F]{4}$/, "CRC hex");

  // Recipient template 61: IBAN + ASCII name + flow type 03.
  const sub = parseTlv(fields.get("61") ?? "");
  assert.equal(sub.get("01"), iban);
  assert.equal(sub.get("07"), "Husnu Apak", "name transliterated to ASCII");
  assert.equal(sub.get("10"), "03", "P2P flow type");

  // CRC is self-consistent (computed over payload incl. "6304").
  assert.equal(qr.slice(-4), crc16ccitt(qr.slice(0, -4)));
});

test("free-amount code omits tag 54", () => {
  const qr = buildFastKarekod({
    iban: "tr61 0006 4000 0011 1711 0222 93",
    name: "Özgür Adnan Yahşi",
  });
  const fields = parseTlv(qr);
  assert.equal(fields.has("54"), false, "no amount tag");
  const sub = parseTlv(fields.get("61") ?? "");
  assert.equal(sub.get("07"), "Ozgur Adnan Yahsi");
  assert.equal(qr.slice(-4), crc16ccitt(qr.slice(0, -4)));
});

test("kuruş rounding handles decimals", () => {
  const qr = buildFastKarekod({
    iban: "TR610006400000110117102293",
    name: "Test",
    amount: 8458.4,
  });
  const fields = parseTlv(qr);
  assert.equal(fields.get("54"), "000000845840");
});

test("rejects invalid IBAN", () => {
  assert.throws(() => buildFastKarekod({ iban: "DE1234", name: "X" }));
});
