// FAST "TR Karekod" (kişiden kişiye) payload builder.
//
// Turkish bank apps reject a QR that contains a bare IBAN string; they expect
// the TCMB TR Karekod format: an EMVCo-MPM style TLV payload. Per the FAST
// TR Karekod guide, person-to-person recipient info lives in template ID 30
// (BKM card payments use 26/27): GUID "TR.GOV.TCMB" (30/00), recipient IBAN
// (30/01) and the mandatory flow-type sub-field 30/02 fixed to "03" (P2P).
// Root fields: currency 949 (TRY), country "TR", recipient name, and a CRC-16
// (ISO/IEC 13239, poly 0x1021, init 0xFFFF) over the whole payload including
// the "6304" prefix of the CRC field itself.

/** value must already be the final string; id is a 2-digit EMV tag. */
function tlv(id: string, value: string): string {
  const len = value.length;
  if (len === 0) return "";
  if (len > 99) throw new Error(`TLV ${id} value too long (${len})`);
  return id + String(len).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE — the checksum EMV QR payloads use. */
export function crc16ccitt(input: string): string {
  let crc = 0xffff;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Keeps only characters that are broadly safe across bank QR parsers and
 * clamps to EMV's 25-char recipient-name limit.
 */
function sanitizeName(name: string): string {
  const cleaned = name
    .replace(/[^\p{L}\p{N} .,'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "ALICI").slice(0, 25);
}

export function buildFastKarekod(input: {
  iban: string;
  name: string;
  /** Amount in TRY. Omit for a static (amount-free) code. */
  amount?: number;
}): string {
  const iban = input.iban.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) {
    throw new Error("Geçerli bir TR IBAN gerekli.");
  }

  const hasAmount =
    typeof input.amount === "number" &&
    Number.isFinite(input.amount) &&
    input.amount > 0;

  // FAST P2P recipient template (30): GUID + IBAN + flow type "03".
  const account =
    tlv("00", "TR.GOV.TCMB") + tlv("01", iban) + tlv("02", "03");

  let payload =
    tlv("00", "01") + // payload format indicator
    tlv("01", hasAmount ? "12" : "11") + // dynamic when an amount is embedded
    tlv("30", account) +
    tlv("53", "949"); // ISO 4217 numeric for TRY (FAST is TRY-only)

  if (hasAmount) {
    payload += tlv("54", input.amount!.toFixed(2));
  }

  payload += tlv("58", "TR") + tlv("59", sanitizeName(input.name));

  payload += "6304";
  payload += crc16ccitt(payload);
  return payload;
}
