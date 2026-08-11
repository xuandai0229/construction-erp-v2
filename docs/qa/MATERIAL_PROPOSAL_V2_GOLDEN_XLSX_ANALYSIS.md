# MATERIAL PROPOSAL V2 — GOLDEN XLSX ANALYSIS

## 1. Workbook structure

- File: `2.Đề xuất, yêu cầu vật tư điện - dây điện.xlsx` (12,891 bytes at audit time).
- Two sheets: `foxz` (`veryHidden`, used range `A1`) and `kl` (visible, active sheet, used range `A1:H32`).
- Active workbook tab is `kl`; `foxz` is not the business print sheet.

## 2. Print and layout

The selected `kl` sheet is landscape, scale 97%, with margins left/right 0.7/0.3 and top/bottom 0.5. The workbook uses Page Break Preview. No header/footer text, Excel table, validation, conditional formatting, or formulas were found. Print area is defined at workbook level and requires Excel to resolve the local sheet reference.

## 3. Cell structure and styles

- Merges: `A1:D1`, `E1:H1`, `A2:H2`, `F3:H3`, `A4:H4`, `A5:H5`, `A6:H6`, `A7:H7`, `A8:A9`, `B8:B9`, `C8:C9`, `D8:E8`, `F8:F9`, `G8:G9`, `H8:H9`, `A31:H31`, `A32:C32`, `D32:E32`, `F32:H32`.
- Columns A:H widths: 5.109375, 30, 7, 14.6640625, 14.44140625, 24.6640625, 18, 14.109375.
- Main row heights: row 1 = 33, rows 8/26 = 27.6, row 9 = 24, normal item rows = 24.9, row 32 = 29.25.
- Main font/style is represented by the template cell styles; item rows use style IDs 3/4, section sample row uses style ID 19, footer style ID 22, signature style IDs 17/18.
- Borders, horizontal/vertical alignment, wrapping, indentation and number formats are preserved by cloning the source row styles. The item table has no formula cells.

## 4. Business mapping

- `A1:D1`: company name; `E1:H1`: national header.
- `A2:H2`: document title `ĐỀ XUẤT VẬT TƯ, VẬT LIỆU, MÁY MÓC THIẾT BỊ`.
- `F3:H3`: proposal date/location.
- `A4:H4`, `A5:H5`, `A6:H6`, `A7:H7`: project, location, requester/role, purchase reason.
- Header row 8/9: STT, material name, unit, contract quantity text, actual quantity, specification, manufacturer/origin, note.
- Rows 10 onward: dynamic items; a section heading is a visual row without STT/quantity.
- Footer: required delivery date; signature block: requester, technical department, deputy director.

## 5. Dynamic material area and pagination

The sample contains rows 10–29 and demonstrates a section row at 23. Runtime removes only the sample data rows, injects item/section rows, moves the footer and signature block after the final item, preserves print width and keeps fit-to-width = 1. The exporter supports 1, 5, 20, 50 and 100+ logical rows; Excel owns page breaks and repeats only settings present in the Golden workbook.

## 6. Static vs dynamic cells

Static: company header, national header, title, table labels, and signature role labels. Dynamic: date, project/location/requester snapshots, purchase reason, delivery date, and all item fields. Sample data such as `Hoàn thiện...`, `Lê Trọng Hạ`, `Trần phú`, `Cadisun`, and quantities is never seeded or used as defaults.

## 7. Ambiguities

The workbook has a hidden sheet named `foxz` with no business content and a local print-area definition that is not usable as a reliable business mapping. The sample section row is styled but not merged; V2 therefore preserves that visual style instead of inventing a merge.
