import ExcelJS from 'exceljs';

const fills = {
  title: 'FFF6F58D',
  section: 'FFFFD21F',
  input: 'FFFFF59D',
  output: 'FFF28BB9',
  calculated: 'FFB7E1CD',
  selected: 'FF91C3EE',
  information: 'FFBFEFEF',
  warning: 'FFFFE0B2',
  white: 'FFFFFFFF',
};

const border = {
  top: { style: 'thin', color: { argb: 'FF222222' } },
  left: { style: 'thin', color: { argb: 'FF222222' } },
  bottom: { style: 'thin', color: { argb: 'FF222222' } },
  right: { style: 'thin', color: { argb: 'FF222222' } },
};

const styleRange = (worksheet, range, options = {}) => {
  const cells = worksheet.getCellsInRange ? worksheet.getCellsInRange(range) : null;
  if (cells) return cells;
  const [start, end] = range.split(':');
  const startCell = worksheet.getCell(start);
  const endCell = worksheet.getCell(end || start);
  for (let row = startCell.row; row <= endCell.row; row += 1) {
    for (let column = startCell.col; column <= endCell.col; column += 1) {
      const cell = worksheet.getCell(row, column);
      if (options.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: options.fill } };
      if (options.border) cell.border = border;
      if (options.font) cell.font = options.font;
      if (options.alignment) cell.alignment = options.alignment;
    }
  }
  return null;
};

const safeName = (value) => (value || 'sprinkler-hesabi')
  .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ_-]+/gi, '-')
  .replace(/^-+|-+$/g, '') || 'sprinkler-hesabi';

const setLabelValue = (worksheet, row, label, value, unit = '') => {
  worksheet.mergeCells(`A${row}:C${row}`);
  worksheet.getCell(`A${row}`).value = label;
  worksheet.mergeCells(`D${row}:F${row}`);
  worksheet.getCell(`D${row}`).value = value;
  worksheet.getCell(`G${row}`).value = unit;
  styleRange(worksheet, `A${row}:C${row}`, { fill: fills.input, border: true, font: { bold: true }, alignment: { vertical: 'middle' } });
  styleRange(worksheet, `D${row}:G${row}`, { fill: fills.output, border: true, alignment: { vertical: 'middle', horizontal: 'right' } });
};

export const createCalculationWorkbook = (result) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sprinkler Tesisatı';
  workbook.subject = `${result.standard} · Hesap motoru ${result.calculationEngineVersion}`;
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;
  const worksheet = workbook.addWorksheet('Hesap Föyü', { views: [{ state: 'frozen', ySplit: 14 }] });
  worksheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  worksheet.properties.defaultRowHeight = 18;
  worksheet.columns = [
    { width: 6 }, { width: 10 }, { width: 9 }, { width: 13 }, { width: 13 }, { width: 10 },
    { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 14 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 17 },
  ];

  worksheet.mergeCells('A2:Q2');
  worksheet.getCell('A2').value = `${result.projectName.toLocaleUpperCase('tr-TR')} — SPRİNKLER HİDROLİK ÖN HESABI`;
  styleRange(worksheet, 'A2:Q2', { fill: fills.title, border: true, font: { bold: true, size: 16 }, alignment: { vertical: 'middle', horizontal: 'left' } });
  worksheet.getRow(2).height = 28;

  worksheet.mergeCells('A4:Q4');
  worksheet.getCell('A4').value = `${result.standardRevision} · Hesap motoru ${result.calculationEngineVersion}. Açık sarı hücreler girdileri, pembe hücreler sonuçları, yeşil hücreler hesaplanan değerleri gösterir.`;
  styleRange(worksheet, 'A4:Q4', { fill: fills.title, border: true, font: { bold: true } });

  worksheet.mergeCells('A5:Q5');
  worksheet.getCell('A5').value = '1- TASARIM KRİTERLERİ';
  styleRange(worksheet, 'A5:Q5', { fill: fills.section, border: true, font: { bold: true } });

  const criteria = result.criteria;
  const criteriaEntries = [
    ['Tehlike sınıfı', criteria.hazard, ''],
    ['Etkin tehlike sınıfı', criteria.effectiveHazard, ''],
    ['Uygulama alanı', criteria.operationArea, 'm²'],
    ['Tasarım yoğunluğu', criteria.density, 'L/dk·m²'],
    ['Sprinkler koruma alanı', criteria.coverage, 'm²'],
    ['Hesaplanan / gerekli sprinkler', `${criteria.calculatedCount} / ${criteria.targetCount}`, 'adet'],
    ['Sprinkler K faktörü', criteria.kFactor, 'L/dk/√bar'],
    ['Asgari sprinkler debisi', criteria.baseFlow, 'L/dk'],
    ['Asgari sprinkler basıncı', criteria.minimumPressure, 'bar'],
    ['Hazen–Williams C / eşd. boy çarpanı', `${criteria.hazenWilliams} / ${criteria.equivalentCorrectionFactor}`, ''],
  ];
  criteriaEntries.slice(0, 5).forEach(([label, value, unit], index) => setLabelValue(worksheet, 6 + index, label, value, unit));
  criteriaEntries.slice(5).forEach(([label, value, unit], index) => {
    const row = 6 + index;
    worksheet.mergeCells(`I${row}:K${row}`);
    worksheet.getCell(`I${row}`).value = label;
    worksheet.mergeCells(`L${row}:P${row}`);
    worksheet.getCell(`L${row}`).value = value;
    worksheet.getCell(`Q${row}`).value = unit;
    styleRange(worksheet, `I${row}:K${row}`, { fill: fills.input, border: true, font: { bold: true } });
    styleRange(worksheet, `L${row}:Q${row}`, { fill: fills.output, border: true, alignment: { horizontal: 'right' } });
  });

  worksheet.mergeCells('A12:Q12');
  worksheet.getCell('A12').value = '2- KRİTİK DEVRE BASINÇ KAYBI HESABI';
  styleRange(worksheet, 'A12:Q12', { fill: fills.section, border: true, font: { bold: true } });
  const headers = ['No', 'Boru', 'Cins', 'Debi Q\n(L/dk)', 'Debi Q\n(m³/h)', 'Çap\n(inç)', 'İç çap\n(mm)', 'Boru boyu\n(m)', 'Eşdeğer\n(m)', 'Toplam L\n(m)', 'Birim kayıp\n(bar/m)', 'Sürtünme\n(bar)', 'Statik\n(bar)', 'Giriş P\n(bar)', 'Çıkış P\n(bar)', 'Hız\n(m/s)', 'Kontrol'];
  const headerRow = worksheet.getRow(13);
  headerRow.values = headers;
  headerRow.height = 38;
  headerRow.eachCell((cell, column) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column <= 3 ? fills.output : column <= 10 ? fills.input : column <= 16 ? fills.calculated : fills.selected } };
    cell.border = border;
    cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  result.rows.forEach((item, index) => {
    const rowNumber = 14 + index;
    const row = worksheet.getRow(rowNumber);
    row.values = [item.order, item.pipeId, item.kind, item.flow, item.flowM3h, item.diameter, item.insideDiameter, item.physicalLength, item.equivalentLength, item.totalLength, item.unitLoss, item.frictionLoss, item.staticLoss, item.inletPressure, item.outletPressure, item.velocity, item.status];
    row.eachCell((cell, column) => {
      cell.border = border;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: column <= 3 ? fills.output : column <= 10 ? fills.input : column <= 16 ? fills.calculated : fills.selected } };
      cell.alignment = { vertical: 'middle', horizontal: column >= 4 && column <= 16 ? 'right' : 'center' };
      if (column >= 4 && column <= 16) cell.numFmt = '0.000';
    });
  });

  const summaryStart = 15 + result.rows.length;
  worksheet.mergeCells(`A${summaryStart}:Q${summaryStart}`);
  worksheet.getCell(`A${summaryStart}`).value = '3- ÖN BOYUTLANDIRMA SONUÇLARI';
  styleRange(worksheet, `A${summaryStart}:Q${summaryStart}`, { fill: fills.section, border: true, font: { bold: true } });
  const summaries = [
    ['Sprinkler debisi', result.sprinklerFlow, 'L/dk'],
    ['İlave debi', result.additionalFlow, 'L/dk'],
    ['Su kaynağı toplam debisi', result.waterSupplyFlow, 'L/dk'],
    ['Su kaynağı toplam debisi', result.waterSupplyFlowM3, 'm³/h'],
    ['Sprinkler hattı basıncı', result.pompaBasinci, 'bar'],
    ['Teorik pompa gücü', result.teorikPompaGucu, 'kW'],
    ['Verim dahil pompa gücü', result.gercekPompaGucu, 'kW'],
    ['Su deposu hacmi', result.depoHacmi, 'm³'],
  ];
  summaries.forEach(([label, value, unit], index) => setLabelValue(worksheet, summaryStart + 1 + index, label, value, unit));

  const sprinklerSheet = workbook.addWorksheet('Sprinkler Sonuçları', { views: [{ state: 'frozen', ySplit: 2 }] });
  sprinklerSheet.columns = [{ width: 12 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 }];
  sprinklerSheet.addRow(['Sprinkler', 'Durum', 'X (cm)', 'Y (cm)', 'Kot (m)', 'Debi (L/dk)', 'Basınç (bar)', 'Yol kaybı (bar)']);
  sprinklerSheet.getRow(1).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills.section } }; cell.border = border; cell.font = { bold: true }; cell.alignment = { horizontal: 'center' }; });
  result.sprinklerRows.forEach((item) => {
    const row = sprinklerSheet.addRow([`SP-${item.id}`, item.active ? 'Kritik alan' : 'Hesap dışı', item.x, item.y, item.elevation, item.flow, item.pressure, item.pathLoss]);
    row.eachCell((cell, column) => { cell.border = border; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.active ? fills.warning : fills.white } }; if (column >= 3) cell.numFmt = '0.000'; });
  });

  const dutySheet = workbook.addWorksheet('Pompa Görevleri');
  dutySheet.columns = [{ width: 28 }, { width: 18 }, { width: 18 }, { width: 26 }, { width: 18 }];
  dutySheet.addRow(['Görev noktası', 'Debi (L/dk)', 'Gerekli basınç (bar)', 'Kaynak', 'Kontrol']);
  dutySheet.getRow(1).eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fills.section } }; cell.border = border; cell.font = { bold: true }; });
  result.dutyPoints.forEach((item) => {
    const check = result.pumpSelection.checks.find((value) => value.label.startsWith(item.label));
    const row = dutySheet.addRow([item.label, item.flow, item.pressure || null, item.source, check ? (check.passed ? 'Uygun' : 'Uygun değil') : 'Doğrulanmadı']);
    row.eachCell((cell) => { cell.border = border; });
  });
  dutySheet.addRow([]);
  dutySheet.addRow(['Pompa eğrisi sonucu', '', '', '', result.pumpSelection.status]);
  result.pumpSelection.checks.forEach((item) => dutySheet.addRow([item.label, item.requiredFlow || null, item.requiredPressure || null, item.availablePressure ?? null, item.passed ? 'Uygun' : 'Uygun değil']));

  const notes = workbook.addWorksheet('Uyarılar ve Esaslar');
  notes.columns = [{ width: 5 }, { width: 110 }];
  notes.mergeCells('A1:B1');
  notes.getCell('A1').value = 'UYARILAR VE HESAP ESASLARI';
  styleRange(notes, 'A1:B1', { fill: fills.section, border: true, font: { bold: true, size: 14 } });
  const noteLines = [
    `${result.standard} — ${result.standardRevision} — hesap motoru ${result.calculationEngineVersion}`,
    ...result.warnings,
    'Hazen–Williams: Δp = 6,05×10⁵×L×Q^1,85 / (C^1,85×d^4,87); L=m, Q=L/dk, d=mm, sonuç=bar.',
    'Sprinkler: Q=K√P; statik basınç farkı: Δp=0,0981×Δz (bar).',
    `Resmî kaynak: ${result.sourceUrl}`,
    'Normatif kontrol: Binaların Yangından Korunması Hakkında Yönetmelik, Bakanlık kılavuzu ve proje için yürürlükte kabul edilen TS EN 12845 baskısı.',
  ];
  noteLines.forEach((line, index) => {
    const row = index + 3;
    notes.getCell(`A${row}`).value = index + 1;
    notes.getCell(`B${row}`).value = line;
    styleRange(notes, `A${row}:B${row}`, { fill: index === 0 ? fills.information : fills.warning, border: true, alignment: { vertical: 'top', wrapText: true } });
    notes.getRow(row).height = 32;
  });

  return workbook;
};

export const downloadCalculationWorkbook = async (result) => {
  const workbook = createCalculationWorkbook(result);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName(result.projectName)}-hidrolik-on-hesap.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
};
