import { inflateRawSync } from 'node:zlib';

/*
 * A spreadsheet, read and written, without a dependency.
 *
 * The obvious move here is `npm install exceljs`. It brings 23MB and,
 * at the time of writing, twenty-seven advisories including a critical
 * one — a high price for reading a grid of text on a site that also
 * holds four hundred people's telephone numbers. An .xlsx is a zip of a
 * few XML parts, and the part of it this platform needs is small: a
 * sheet of strings, written once as a template and read back once as an
 * import.
 *
 * So this module does exactly that much and refuses to grow: no
 * formulas, no styles beyond a bold header, no images, no formatting.
 * Anything it cannot read, it says so about, rather than guessing.
 */

/* ── zip ────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

const crc32 = (data: Buffer): number => {
  let c = -1;
  for (const byte of data) {
    c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
};

interface ZipEntry {
  name: string;
  body: Buffer;
}

/*
 * A zip archive with one stored (uncompressed) entry per part. Stored
 * rather than deflated on purpose: a template is a few kilobytes, and
 * every byte of this file is a byte somebody has to trust.
 */
const zip = (entries: ZipEntry[]): Buffer => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.body);
    const size = entry.body.length;

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); /* version needed */
    local.writeUInt16LE(0x0800, 6); /* UTF-8 names */
    local.writeUInt16LE(0, 8); /* stored */
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    name.copy(local, 30);
    locals.push(local, entry.body);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);

    offset += local.length + size;
  }

  const centralBlock = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBlock.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...locals, centralBlock, end]);
};

const unzip = (archive: Buffer): Map<string, Buffer> => {
  const files = new Map<string, Buffer>();

  /* The end-of-central-directory record, found from the back. */
  let end = -1;
  for (let i = archive.length - 22; i >= 0 && i > archive.length - 66_000; i -= 1) {
    if (archive.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) {
    throw new Error('not a zip archive');
  }

  const count = archive.readUInt16LE(end + 10);
  let pointer = archive.readUInt32LE(end + 16);

  for (let i = 0; i < count; i += 1) {
    if (archive.readUInt32LE(pointer) !== 0x02014b50) {
      break;
    }
    const method = archive.readUInt16LE(pointer + 10);
    const compressed = archive.readUInt32LE(pointer + 20);
    const nameLength = archive.readUInt16LE(pointer + 28);
    const extraLength = archive.readUInt16LE(pointer + 30);
    const commentLength = archive.readUInt16LE(pointer + 32);
    const localOffset = archive.readUInt32LE(pointer + 42);
    const name = archive
      .subarray(pointer + 46, pointer + 46 + nameLength)
      .toString('utf8');

    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = archive.subarray(start, start + compressed);

    files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return files;
};

/* ── xml ────────────────────────────────────────────────────────── */

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const unescapeXml = (value: string): string =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');

const columnName = (index: number): string => {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
};

const columnIndex = (ref: string): number => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64);
  }
  return index - 1;
};

/* ── writing ────────────────────────────────────────────────────── */

export interface SheetData {
  name: string;
  /* Row zero is the header; every cell is written as text. */
  rows: string[][];
  /* Column widths in characters, so the template opens readable. */
  widths?: number[];
}

const sheetXml = (sheet: SheetData): string => {
  const cols = sheet.widths
    ? `<cols>${sheet.widths
        .map(
          (width, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`,
        )
        .join('')}</cols>`
    : '';

  const rows = sheet.rows
    .map((row, r) => {
      const cells = row
        .map((value, c) =>
          value === ''
            ? ''
            : `<c r="${columnName(c)}${r + 1}" t="inlineStr"${
                r === 0 ? ' s="1"' : ''
              }><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`,
        )
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData></worksheet>`;
};

/*
 * One workbook, one or more sheets of text. The only style defined is a
 * bold header row — enough for the template to read as a form rather
 * than a wall.
 */
export const writeWorkbook = (sheets: SheetData[]): Buffer => {
  const sheetEntries = sheets.map((sheet, i) => ({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    body: Buffer.from(sheetXml(sheet), 'utf8'),
  }));

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map(
      (sheet, i) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join('')}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('')}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join(
      '',
    )}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  return zip([
    { name: '[Content_Types].xml', body: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', body: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml', body: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', body: Buffer.from(workbookRels, 'utf8') },
    { name: 'xl/styles.xml', body: Buffer.from(styles, 'utf8') },
    ...sheetEntries,
  ]);
};

/* ── reading ────────────────────────────────────────────────────── */

/*
 * Excel keeps a date as a number of days since 1900, and the year 1900
 * is treated as a leap year for compatibility with a bug older than
 * most of the people using it. A cell that reads 12/10/2026 to a human
 * therefore arrives here as 46307. Text is preferred — the template
 * asks for it — but a date typed as a date is not the editor's mistake,
 * so it is converted rather than refused.
 */
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/*
 * A time typed as a time is a fraction of a day: 10:00 arrives as
 * 0.4166666. Excel never says "this is a time" in the cell itself, so
 * the fraction is the only signal there is.
 */
export const fromExcelTime = (fraction: number): string => {
  const minutes = Math.round(fraction * 24 * 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
};

export const fromExcelSerial = (serial: number): string => {
  const days = Math.floor(serial);
  const fraction = serial - days;
  const millis = EXCEL_EPOCH + days * 86_400_000 + Math.round(fraction * 86_400_000);
  const date = new Date(millis);
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  return fraction > 0 ? `${day} ${time}` : day;
};

const sharedStringsOf = (xml: string): string[] =>
  [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    [...(match[1] ?? '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((piece) => unescapeXml(piece[1] ?? ''))
      .join(''),
  );

/*
 * The first sheet, as a grid of trimmed strings. Empty trailing cells
 * are not padded away: a row keeps its shape, so column five is column
 * five whether or not column four was filled in.
 */
export const readFirstSheet = (file: Buffer): string[][] => {
  const parts = unzip(file);
  const sheetPath =
    [...parts.keys()].find((name) => /^xl\/worksheets\/sheet1\.xml$/.test(name)) ??
    [...parts.keys()].find((name) => name.startsWith('xl/worksheets/'));
  if (!sheetPath) {
    throw new Error('no worksheet in this file');
  }
  const xml = parts.get(sheetPath)!.toString('utf8');
  const shared = sharedStringsOf(
    parts.get('xl/sharedStrings.xml')?.toString('utf8') ?? '',
  );

  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? '').matchAll(
      /<c([^>]*)>([\s\S]*?)<\/c>/g,
    )) {
      const attributes = cellMatch[1] ?? '';
      const body = cellMatch[2] ?? '';
      const ref = /r="([A-Z]+\d+)"/.exec(attributes)?.[1] ?? '';
      const type = /t="([^"]+)"/.exec(attributes)?.[1] ?? 'n';
      const at = ref ? columnIndex(ref) : cells.length;

      let value = '';
      if (type === 'inlineStr') {
        value = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
          .map((piece) => unescapeXml(piece[1] ?? ''))
          .join('');
      } else {
        const raw = unescapeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
        if (type === 's') {
          value = shared[Number(raw)] ?? '';
        } else if (raw !== '' && Number.isFinite(Number(raw))) {
          /*
           * A bare number that is plausibly a date (Excel's own serial
           * range for this decade) is read as one; anything else stays
           * the number it is, so a capacity of 30 remains 30.
           */
          const numeric = Number(raw);
          if (numeric > 0 && numeric < 1) {
            value = fromExcelTime(numeric);
          } else if (numeric > 40_000 && numeric < 80_000) {
            value = fromExcelSerial(numeric);
          } else {
            value = raw;
          }
        } else {
          value = raw;
        }
      }

      while (cells.length < at) {
        cells.push('');
      }
      cells[at] = value.trim();
    }
    rows.push(cells);
  }

  return rows;
};

/*
 * The same grid from a comma-separated file, because half the people
 * who are asked for a spreadsheet send one of these. Quoted fields,
 * doubled quotes inside them, and a BOM at the front are all handled;
 * nothing else is.
 */
export const readCsv = (file: Buffer): string[][] => {
  const text = file.toString('utf8').replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value !== ''));
};

export const readGrid = (file: Buffer, filename: string): string[][] =>
  /\.csv$/i.test(filename) ? readCsv(file) : readFirstSheet(file);
