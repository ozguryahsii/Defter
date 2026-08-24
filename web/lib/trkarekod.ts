// FAST "TR Karekod" (kişiden kişiye) payload builder.
//
// The field layout mirrors real bank-generated FAST P2P QR codes byte for
// byte (reverse-engineered from working samples; CRC verified against them):
//
//   75 02 "10"                         TR Karekod header/version
//   01 02 "11"                         initiation (banks use "11" even with amount)
//   02 04 <participant code>           FAST participant, from the IBAN bank code
//   03 12 <reference no>               12-digit numeric reference
//   54 12 <amount in kuruş>            zero-padded, only when an amount is set
//   61 .. template:
//        01 26 <IBAN>
//        07 .. <recipient name>        ASCII-transliterated
//        10 02 "03"                    flow type: person-to-person
//   20 32 <unique id>                  32 lowercase hex chars
//   63 04 <CRC>                        CRC-16 ISO/IEC 13239 (poly 0x1021, init
//                                      0xFFFF) over everything incl. "6304"

function tlv(id: string, value: string): string {
  const len = value.length;
  if (len === 0) return "";
  if (len > 99) throw new Error(`TLV ${id} value too long (${len})`);
  return id + String(len).padStart(2, "0") + value;
}

/** CRC-16/CCITT-FALSE — matches the CRC used by bank-issued TR Karekods. */
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

const TR_MAP: Record<string, string> = {
  ç: "c", Ç: "C", ğ: "g", Ğ: "G", ı: "i", İ: "I",
  ö: "o", Ö: "O", ş: "s", Ş: "S", ü: "u", Ü: "U",
};

/** Banks emit ASCII names ("Özgür"→"Ozgur"); mirror that for compatibility. */
function toAsciiName(name: string): string {
  const ascii = name
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .replace(/[^A-Za-z0-9 .,'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (ascii || "ALICI").slice(0, 25);
}

function randomDigits(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10);
  return out;
}

function randomHex32(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  let out = "";
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

export function buildFastKarekod(input: {
  iban: string;
  name: string;
  /** Amount in TRY. Omit for a free-amount code. */
  amount?: number;
}): string {
  const iban = input.iban.replace(/\s+/g, "").toUpperCase();
  if (!/^TR\d{24}$/.test(iban)) {
    throw new Error("Geçerli bir TR IBAN gerekli.");
  }

  // IBAN layout: TR + 2 check digits + 5-digit bank code + ...
  // FAST participant code is the bank code's last 4 digits (00157 -> 0157).
  const participant = iban.slice(5, 9);

  const hasAmount =
    typeof input.amount === "number" &&
    Number.isFinite(input.amount) &&
    input.amount > 0;

  let payload =
    tlv("75", "10") +
    tlv("01", "11") +
    tlv("02", participant) +
    tlv("03", randomDigits(12));

  if (hasAmount) {
    const kurus = Math.round(input.amount! * 100);
    if (kurus > 999_999_999_999) throw new Error("Tutar çok büyük.");
    payload += tlv("54", String(kurus).padStart(12, "0"));
  }

  const recipient =
    tlv("01", iban) + tlv("07", toAsciiName(input.name)) + tlv("10", "03");
  payload += tlv("61", recipient);

  payload += tlv("20", randomHex32());

  payload += "6304";
  payload += crc16ccitt(payload);
  return payload;
}
