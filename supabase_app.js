// supabase_app.js — ENHANCED WITH MISSING FEATURES FROM LOCAL VERSION

const SUPABASE_URL = 'https://givvsxoytchsdcxvyxud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdnZzeG95dGNoc2RjeHZ5eHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzU4MTYsImV4cCI6MjA2NzIxMTgxNn0.GX8xGEuhnfJmxoxk5-7B8E5eLdLwLazXUyq_arx-NuQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let items = [];
let selectedItems = [];
let billNo = 1;
let sales = JSON.parse(localStorage.getItem("sales") || "[]");
const { jsPDF } = window.jspdf;



window.onload = async function () {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    showApp();
    await loadMenuFromDB();
  } else {
    showLogin();
  }
};

function showLogin() {
  document.getElementById("login-section").style.display = "block";
  document.getElementById("app-section").style.display = "none";
}

function showApp() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("app-section").style.display = "block";
  document.getElementById("user-display").innerText = `Welcome, ${currentUser.email}`;
  renderMenu();
  renderBill();
  //updateDashboard();
}

async function register() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return alert("Register failed: " + error.message);
  alert("Check your email to confirm and then login.");
}

async function login() {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert("Login failed: " + error.message);
  currentUser = data.user;
  showApp();
  await loadMenuFromDB();
}

async function logout() {
  await supabaseClient.auth.signOut();
  showLogin();
}

async function loadMenuFromDB() {
  const { data, error } = await supabaseClient.from("user_menu").select("*").eq("user_id", currentUser.id);
  if (error) return console.error("Menu load error:", error);
  items = data;
  renderMenu();
}
async function loadMenuFromDB() {
  const { data, error } = await supabaseClient.from("user_menu").select("*").eq("user_id", currentUser.id);
  if (error) {
    alert("Failed to load menu from database.");
    return console.error("Menu load error:", error);
  }
  items = data;
  // localStorage.setItem("menuItems", JSON.stringify(items)); // Save to localStorage
  renderMenu();
}


async function addMenuItem(userId, name, price, image) {
  const { error } = await supabaseClient.from("user_menu").insert([
    { user_id: userId, name, price, image }
  ]);
  if (error) {
  alert("Menu add failed: " + error.message);
  console.error("Add menu error:", error);
}

  else await loadMenuFromDB();
}

async function saveSale() {
  const date = new Date();
  const total = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const bill = {
    user_id: currentUser.id,
    bill_no: billNo++,
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    items: selectedItems,
    total
  };
  const { error } = await supabaseClient.from("user_sales").insert([bill]);
  if (error) return alert("Bill save failed:", error.message);
  selectedItems = [];
  renderBill();
  renderMenu();
  //updateDashboard();
  alert("Bill saved!");
}

async function getSalesInRange(startDate, endDate) {
  const { data, error } = await supabaseClient
    .from("user_sales")
    .select("*")
    .eq("user_id", currentUser.id)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());
  if (error) return alert("Sales fetch error: " + error.message);
  return data;
}

function renderMenu() {
  const menuDiv = document.getElementById("menu");
  menuDiv.innerHTML = items.length === 0 ? '<p style="text-align:center;">🍽 No items in menu yet. Add from Settings ➕</p>' : "";
  items.forEach((item, index) => {
    const existing = selectedItems.find(i => i.name === item.name);
    const quantity = existing ? existing.qty : 0;
    const div = document.createElement("div");
    div.className = "menu-item";
    div.onclick = () => addToBill(item);
    div.innerHTML = `
      <img src="${item.image}" class="menu-image" alt="${item.name}" />
      <div>${item.name}<br>₹${item.price}</div>
      <div class="menu-controls">
        <button onclick="changeQty(${index}, -1); event.stopPropagation();">−</button>
        <span id="qty-${index}">${quantity}</span>
        <button onclick="changeQty(${index}, 1); event.stopPropagation();">+</button>
      </div>
    `;
    menuDiv.appendChild(div);
  });
}

function addToBill(item) {
  const existing = selectedItems.find(i => i.name === item.name);
  if (existing) existing.qty++;
  else selectedItems.push({ ...item, qty: 1 });
  renderBill();
  renderMenu();
}

function changeQty(index, delta) {
  const item = items[index];
  const existing = selectedItems.find(i => i.name === item.name);
  if (existing) {
    existing.qty += delta;
    if (existing.qty <= 0) selectedItems = selectedItems.filter(i => i.name !== item.name);
  } else if (delta > 0) {
    selectedItems.push({ ...item, qty: 1 });
  }
  renderBill();
  document.getElementById(`qty-${index}`).innerText = selectedItems.find(i => i.name === item.name)?.qty || 0;
}

function renderBill() {
  const tbody = document.querySelector("#bill-table tbody");
  tbody.innerHTML = "";
  let totalAmount = 0;
  let totalQty = 0;
  selectedItems.forEach(item => {
    const itemTotal = item.price * item.qty;
    totalAmount += itemTotal;
    totalQty += item.qty;
    tbody.innerHTML += `<tr>
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>₹${item.price}</td>
      <td>₹${itemTotal}</td>
    </tr>`;
  });
  document.getElementById("total-display").innerText = `Total Items: ${selectedItems.length}, Quantity: ${totalQty}, Grand Total: ₹${totalAmount}`;
}

// async function updateDashboard() {
//   const today = new Date();
//   const start = new Date(today.setHours(0, 0, 0, 0));
//   const end = new Date(today.setHours(23, 59, 59, 999));
//   getSalesInRange(start, end).then(salesToday => {
//     const totalSales = salesToday.reduce((sum, sale) => sum + sale.total, 0);
//     const totalQty = salesToday.reduce((sum, sale) => sum + sale.items.reduce((s, i) => s + i.qty, 0), 0);
//     const totalBills = salesToday.length;
//     document.getElementById("dash-total-sales").innerText = `₹${totalSales}`;
//     document.getElementById("dash-total-qty").innerText = `${totalQty}`;
//     document.getElementById("dash-total-bills").innerText = `${totalBills}`;
//   });
// }
function filterMenu() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    const name = item.querySelector("div").innerText.toLowerCase();
    item.style.display = name.includes(query) ? "block" : "none";
  });
}
let printerDevice = null;
let printerCharacteristic = null;
function prepareAndPrint() {
  const date = new Date();
  const current = {
    billNo,
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    items: [...selectedItems],
    total: selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  };
  supabaseClient.from("user_sales").insert([{
    user_id: currentUser.id,
    bill_no: current.billNo,
    date: current.date,
    time: current.time,
    items: current.items,
    total: current.total
  }]).then(() => {
    localStorage.setItem("billNo", ++billNo);
    printBillRaw(current).then(() => {
      selectedItems = [];
      renderBill();
      renderMenu();
      //updateDashboard();
    });
  }).catch(error => {
    alert("Failed to save sale: " + error.message);
  });
}
function printBill(current = null, fallbackAttempted = false) {
  const date = new Date();
  const currentBill = current || {
    billNo,
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    items: [...selectedItems],
    total: selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0)
  };

  sales.push(currentBill);
  localStorage.setItem("sales", JSON.stringify(sales));
  localStorage.setItem("billNo", ++billNo);

  let printWindow = window.open('', '', 'width=400,height=600');
  let billHTML = `
    <html>
    <head><title>Print Bill</title></head>
    <body onload="window.print(); window.close();">
    <pre style="font-family: monospace;">
-------------------------------
        ABHI TIFFIN CENTER
    Shop no.4,Patil Complex,
             Bidar
-------------------------------
Bill No:ATC-${currentBill.billNo}
Date,Time:${currentBill.date},${currentBill.time}
-------------------------------
Item       Qty  Rate  Total
${currentBill.items.map(i =>
  `${i.name.padEnd(10)} ${i.qty.toString().padEnd(4)} ₹${i.price.toString().padEnd(5)} ₹${(i.price * i.qty)}`
).join('\n')}
-------------------------------
Total Items: ${currentBill.items.length},Total Qty:${currentBill.items.reduce((sum, i) => sum + i.qty, 0)}
-------------------------------
Grand Total: ₹${currentBill.total}
-------------------------------
    THANK YOU! VISIT AGAIN
-------------------------------
    </pre>
    </body>
    </html>`;

  printWindow.document.write(billHTML);
  // printWindow.document.close();

  // Only call printBillRaw if it wasn't already attempted
  if (!fallbackAttempted) {
    printBillRaw(currentBill, true);
  }

  saveSale();
  selectedItems = [];
  renderBill();
  renderMenu();
  //updateDashboard();
}

function buildEscPosCommands(current) {
    const { billNo, date, time, items, total } = current;
    let cmds = "";
    cmds += "\x1B\x40";
    cmds += "\x1B\x61\x01";
    cmds += "ABHI TIFFIN CENTER\n";
    cmds += "\x1B\x61\x00";
    cmds += `Bill No: ATC-${billNo}\n`;
    cmds += `Date:${date},Time:${time}\n`;
    cmds += "-----------------------------\n";
    cmds += "Item      Qty  Rate  Total\n";
    items.forEach(i => {
      cmds += `${i.name.padEnd(10)} ${i.qty.toString().padEnd(3)} x${i.price}     ${i.price * i.qty} \n`;
    });
    cmds += "--------------\n";
    cmds += `Total items:${current.items.length}\n`;
    cmds += "-----------------------------\n";
    cmds += `GRAND TOTAL:|${total}|\n`;
    cmds += "-----------------------------\n";
    cmds += "Thank You! Visit Again.\n";
    cmds += "Software by Tech Innovators.\n\n\n";
    cmds += "\x1D\x56\x41";
    return cmds;
  }
async function printBillRaw(current, fallbackAttempted = false) {
  const raw = buildEscPosCommands(current);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(raw);

  // QZ Tray
  if (window.qz) {
    try {
      await qz.api.connect();
      const cfg = qz.configs.create();
      await qz.print(cfg, [{ type: 'raw', format: 'command', data: raw }]);
      await qz.api.disconnect();
      return;
    } catch (err) {
      console.warn("QZ Tray failed:", err);
    }
  }

  // Web Bluetooth
  if (navigator.bluetooth) {
    try {
      if (!printerDevice || !printerCharacteristic) {
        printerDevice = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        const server = await printerDevice.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        printerCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      }

      const chunkSize = 512;
      for (let i = 0; i < encoded.length; i += chunkSize) {
        const chunk = encoded.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    } catch (err) {
      console.warn("Web Bluetooth failed:", err);
      printerDevice = null;
      printerCharacteristic = null;
    }
  }

  // Prevent infinite loop by checking fallbackAttempted
  if (!fallbackAttempted) {
    alert("Direct print unavailable—opening browser print dialog.");
    printBill(current, true); // mark as fallback
  }
}

function handleDateRangeChange() {
  const range = document.getElementById('report-range').value;
  const customInputs = document.getElementById('custom-date-inputs');
  customInputs.style.display = (range === 'custom') ? 'block' : 'none';
}

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



 


