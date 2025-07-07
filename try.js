async function exportSalesReport() {
  const range = document.getElementById('report-range').value;
  let startDate, endDate;

  const today = new Date();
  endDate = new Date(today.setHours(23, 59, 59, 999));

  if (range === 'today') {
    startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
  } else if (range === '7days') {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === '30days') {
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);
    startDate.setHours(0, 0, 0, 0);
  } else if (range === 'custom') {
    const startInput = document.getElementById('report-start').value;
    const endInput = document.getElementById('report-end').value;
    if (!startInput || !endInput) {
      return alert('Please select both start and end dates.');
    }
    startDate = new Date(startInput);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(endInput);
    endDate.setHours(23, 59, 59, 999);
  }

  const sales = await getSalesInRange(startDate, endDate);
  if (!sales.length) return alert("No sales found in the selected range.");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // === Summary calculations ===
  const totalBills = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalQty = sales.reduce((sum, s) => sum + s.items.reduce((q, i) => q + i.qty, 0), 0);

  // === Title ===
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text("Sales Report", 14, 20);

  // === Info Boxes ===
  const boxY = 28;
  const boxHeight = 16;
  const boxWidth = 58;

  doc.setDrawColor(0);
  doc.setFillColor(220, 237, 200); // Light green
  doc.rect(14, boxY, boxWidth, boxHeight, 'F');
  doc.rect(76, boxY, boxWidth, boxHeight, 'F');
  doc.rect(138, boxY, boxWidth, boxHeight, 'F');

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Total Bills: ${totalBills}`, 18, boxY + 6);
  doc.text(`Total Quantity: ${totalQty}`, 80, boxY + 6);
  doc.text(`Total Revenue: ₹${totalRevenue}`, 142, boxY + 6);

  // === Prepare table rows ===
  const rows = sales.map(sale => {
    const items = sale.items.map(i => `${i.name} x${i.qty}`).join(", ");
    return [
      sale.bill_no,
      sale.date,
      sale.time,
      `₹${sale.total}`,
      items
    ];
  });

  // === Table ===
  doc.autoTable({
    startY: boxY + boxHeight + 10,
    head: [['Bill No', 'Date', 'Time', 'Total', 'Items']],
    body: rows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 136, 229],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 'auto' }
    }
  });

  const startLabel = startDate.toISOString().split("T")[0];
  const endLabel = endDate.toISOString().split("T")[0];
  doc.save(`sales_report_${startLabel}_to_${endLabel}.pdf`);
}
function handleDateRangeChange() {
  const range = document.getElementById('report-range').value;
  const customInputs = document.getElementById('custom-date-inputs');
  customInputs.style.display = (range === 'custom') ? 'block' : 'none';
}