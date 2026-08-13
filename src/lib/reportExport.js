// Export to XLSX (HTML table approach — Excel opens natively)
export function exportToXLSX(data, filename) {
  if (!data || data.length === 0) {
    alert('Nenhum dado para exportar');
    return;
  }
  const headers = Object.keys(data[0]);
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${data.map(row => `<tr>${headers.map(h => `<td>${esc(row[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export to PDF using jsPDF
export async function exportToPDF(title, rows, filename) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.text(title, 14, 15);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 21);

  if (!rows || rows.length === 0) {
    pdf.text('Sem dados no período', 14, 30);
    pdf.save(`${filename}.pdf`);
    return;
  }

  const headers = Object.keys(rows[0]);
  const colW = (pageW - 28) / headers.length;
  let y = 28;

  pdf.setFillColor(245, 166, 35);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(8);
  headers.forEach((h, i) => {
    pdf.rect(14 + i * colW, y, colW, 6, 'F');
    pdf.text(String(h).substring(0, 25), 15 + i * colW, y + 4);
  });
  y += 6;

  pdf.setTextColor(40, 40, 40);
  rows.forEach((row, ri) => {
    if (y > pageH - 10) { pdf.addPage(); y = 15; }
    if (ri % 2 === 0) {
      pdf.setFillColor(240, 240, 240);
      pdf.rect(14, y, pageW - 28, 5, 'F');
    }
    headers.forEach((h, i) => {
      pdf.text(String(row[h] ?? '').substring(0, 30), 15 + i * colW, y + 3.5);
    });
    y += 5;
  });

  pdf.save(`${filename}.pdf`);
}

export function printReport() {
  window.print();
}