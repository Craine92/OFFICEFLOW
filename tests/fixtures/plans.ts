import type { Page } from '@playwright/test';

export function samplePdf() {
  const streams = [
    '0.85 0.9 0.85 rg 20 20 560 360 re f 0.2 0.4 0.3 RG 4 w 30 30 540 340 re S 300 30 m 300 370 l S 0.2 0.4 0.3 rg BT /F1 22 Tf 55 325 Td (GRUNDRISS - ETAGE 1) Tj ET',
    '0.9 0.92 0.88 rg 20 20 360 560 re f 0.2 0.4 0.3 RG 4 w 30 30 340 540 re S 30 300 m 370 300 l S 0.2 0.4 0.3 rg BT /F1 20 Tf 50 530 Td (GRUNDRISS - ETAGE 2) Tj ET',
  ];
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 400] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(streams[0])} >>\nstream\n${streams[0]}\nendstream`,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    `<< /Length ${Buffer.byteLength(streams[1])} >>\nstream\n${streams[1]}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return { name: 'Bueroplan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(pdf) };
}
export async function imageFile(page: Page, mime = 'image/png') {
  const base64 = await page.evaluate((type) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#fafaf5';
    c.fillRect(0, 0, 1200, 800);
    c.fillStyle = '#eff4ed';
    c.fillRect(40, 40, 1120, 720);
    c.strokeStyle = '#66796c';
    c.lineWidth = 9;
    c.strokeRect(45, 45, 1110, 710);
    c.beginPath();
    c.moveTo(800, 45);
    c.lineTo(800, 550);
    c.lineTo(1155, 550);
    c.stroke();
    c.fillStyle = '#6f8776';
    c.font = '22px sans-serif';
    c.fillText('NORDLICHT · EIGENER GRUNDRISS', 85, 105);
    c.font = '17px sans-serif';
    c.fillText('Meetingbereich', 850, 310);
    c.fillStyle = '#dce8dd';
    for (let x = 150; x < 700; x += 170) {
      c.fillRect(x, 230, 100, 60);
      c.fillRect(x, 430, 100, 60);
    }
    return canvas.toDataURL(type).split(',')[1];
  }, mime);
  return {
    name: `Bueroplan.${mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'}`,
    mimeType: mime,
    buffer: Buffer.from(base64, 'base64'),
  };
}
