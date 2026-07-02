import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFastKarekod, crc16ccitt } from "../lib/trkarekod";

test("crc16ccitt matches the official EMVCo QRCPS example vector", () => {
  // From the EMV QR Code Specification (MPM) Annex: this exact payload's CRC
  // is documented as A13A. Validates poly 0x1021 / init 0xFFFF over UTF-8.
  const payload =
    "00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A011223344998877070812345678" +
    "6304";
  assert.equal(crc16ccitt(payload), "A13A");
});

test("buildFastKarekod produces a well-formed TLV payload", () => {
  const iban = "TR610006400000110117102293"; // TR + 24 digits
  const qr = buildFastKarekod({ iban, name: "Hüsnü Apak", amount: 8458 });

  assert.ok(qr.startsWith("000201"), "payload format indicator");
  assert.ok(qr.includes("0102" + "12"), "dynamic initiation when amount set");
  // FAST P2P template is ID 30: GUID + IBAN + flow type 03.
  const account = "0011TR.GOV.TCMB" + "0126" + iban + "020203";
  assert.ok(
    qr.includes("30" + String(account.length).padStart(2, "0") + account),
    "template 30 with GUID + IBAN + flow type 03",
  );
  assert.ok(qr.includes("5303949"), "TRY currency 949");
  assert.ok(qr.includes("54078458.00"), "amount 8458.00");
  assert.ok(qr.includes("5802TR"), "country TR");
  assert.ok(/6304[0-9A-F]{4}$/.test(qr), "ends with 4-hex CRC");

  // Recompute the CRC over everything before the CRC value itself.
  const body = qr.slice(0, -4);
  assert.equal(qr.slice(-4), crc16ccitt(body));
});

test("static code when no amount; name is sanitized and clamped", () => {
  const qr = buildFastKarekod({
    iban: "tr61 0006 4000 0011 1711 0222 93",
    name: "  Çok  Uzun İsimli Bir Alıcı Adı Örneği ***  ",
  });
  assert.ok(qr.includes("0102" + "11"), "static initiation without amount");
  // No amount tag: "54" must not directly follow the currency field.
  assert.ok(!qr.includes("530394954"), "no amount tag 54 after currency");
  // name tag 59 exists and is <= 25 chars
  const m = qr.match(/59(\d{2})/);
  assert.ok(m && Number(m[1]) <= 25);
});

test("rejects invalid IBAN", () => {
  assert.throws(() => buildFastKarekod({ iban: "DE1234", name: "X" }));
});
