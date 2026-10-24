import type { RoomUsage } from './types'

export async function exportUsagePdf(
    rows: RoomUsage[],
    query: string,
) {
    const [{ jsPDF }, { autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ])

    const parameters = new URLSearchParams(query)
    const start = new Date(parameters.get('from')!)
    const finalDay = new Date(
        new Date(parameters.get('to')!).getTime() - 1,
    )

    const dateFormat = new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    })

    const period =
        `${dateFormat.format(start)} through ` +
        `${dateFormat.format(finalDay)} (inclusive)`

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
    })

    doc.setProperties({
        title: 'Room usage report',
        subject: period,
        creator: 'Room Reservation',
    })

    autoTable(doc, {
        startY: 57,
        margin: { top: 57, right: 14, bottom: 18, left: 14 },
        theme: 'striped',
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'middle',
        },
        headStyles: {
            fillColor: [23, 43, 77],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [244, 246, 250],
        },
        columnStyles: {
            0: { cellWidth: 55 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right' },
        },
        head: [[
            'Room',
            'Finished bookings',
            'Checked in',
            'No check-in',
            'Scheduled minutes',
            'Recorded minutes',
            'Recorded use / booked time',
        ]],
        body: rows.map(row => [
            `${row.roomName}\nID: ${row.roomId}`,
            row.completedReservations,
            row.checkedInReservations,
            row.reservationsWithoutCheckIn,
            row.scheduledMinutes.toFixed(2),
            row.recordedUsageMinutes.toFixed(2),
            row.usagePercent === null
                ? 'N/A'
                : `${row.usagePercent.toFixed(2)}%`,
        ]),
    })

    const pageCount = doc.getNumberOfPages()

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page)

        doc.setTextColor(23, 43, 77)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(19)
        doc.text('Room usage report', 14, 18)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(70, 80, 95)
        doc.text(`Applied period: ${period}`, 14, 26)

        doc.setFontSize(9)
        doc.text([
            'Only finished, non-cancelled meetings are included. All durations are in minutes.',
            'Recorded usage is based on manual check-in; without an early end, usage continues to the scheduled end.',
            'No check-in counts as zero recorded usage. N/A means scheduled minutes are zero.',
            'Dates follow the local time zone used when applying the report.',
        ], 14, 34)

        doc.setDrawColor(220, 225, 233)
        doc.line(14, 196, 283, 196)

        doc.setFontSize(8)
        doc.text('Room Reservation', 14, 202)
        doc.text(
            `Page ${page} of ${pageCount}`,
            283,
            202,
            { align: 'right' },
        )
    }

    doc.save('room-usage-report.pdf')
}