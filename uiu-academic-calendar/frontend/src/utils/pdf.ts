// PDF of one term's calendar (date, day, event, plus notes), built in the browser.
import type { Term } from './calendar'
import { CATEGORY_META } from './calendar'

export async function downloadPdf(term: Term) {
  // loaded only when needed, so the page itself stays light
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const M = 16

  doc.setFillColor(255, 122, 24)
  doc.rect(0, 0, W, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(185, 80, 10)
  doc.text('UNITED INTERNATIONAL UNIVERSITY · ACADEMIC CALENDAR', M, 16)
  doc.setTextColor(27, 23, 20)
  doc.setFontSize(16)
  const titleLines = doc.splitTextToSize(term.title, W - M * 2)
  doc.text(titleLines, M, 25)
  let y = 25 + titleLines.length * 7

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Day', 'Event', 'Type']],
    body: term.events.map(e => [e.dateText || '—', e.dayText, e.title + (e.marks ? ' ' + '*'.repeat(e.marks) : ''), CATEGORY_META[e.category].label]),
    theme: 'grid',
    headStyles: { fillColor: [255, 122, 24], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.6, lineColor: [230, 225, 219], textColor: [27, 23, 20], overflow: 'linebreak' },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' }, 1: { cellWidth: 22 }, 3: { cellWidth: 24, textColor: [108, 100, 93] } },
    alternateRowStyles: { fillColor: [250, 248, 246] },
    margin: { left: M, right: M },
  })
  y = (doc as any).lastAutoTable.finalY + 10

  if (term.notes.length) {
    if (y > 260) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Important notes', M, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    for (const n of term.notes) {
      const lines = doc.splitTextToSize('•  ' + n, W - M * 2)
      if (y + lines.length * 4 > 285) { doc.addPage(); y = 20 }
      doc.text(lines, M, y)
      y += lines.length * 4 + 2
    }
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(7.5)
    doc.setTextColor(140, 132, 125)
    doc.text('Source: uiu.ac.bd/academics/calendar · uiu-calendar-api.vercel.app', M, 292)
    doc.text(`${p} / ${pages}`, W - M, 292, { align: 'right' })
  }
  doc.save(`uiu-${term.id}.pdf`)
}
