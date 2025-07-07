// supabase_app.js — ENHANCED WITH MISSING FEATURES FROM LOCAL VERSION

const SUPABASE_URL = 'https://givvsxoytchsdcxvyxud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdnZzeG95dGNoc2RjeHZ5eHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzU4MTYsImV4cCI6MjA2NzIxMTgxNn0.GX8xGEuhnfJmxoxk5-7B8E5eLdLwLazXUyq_arx-NuQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let items = [];
let selectedItems = [];
let billNo = 1;
let sales = JSON.parse(localStorage.getItem("sales") || "[]");
let printerDevice = null;
let printerCharacteristic = null;
// const { jsPDF } = window.jspdf;

const jsPDF = window.jspdf.jsPDF;



window.onload = async function () {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    currentUser = session.user;

    // Try to load ownerName and hotelAddress from localStorage
    const profile = JSON.parse(localStorage.getItem("userProfile"));
    if (profile) {
      currentUser.profile = profile;
    } else {
      // fallback values if not available
      currentUser.profile = {
        ownerName: "Owner",
        hotelAddress: "Your Address"
      };
    }

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

  const { ownerName, hotelAddress } = currentUser.profile;

  // Greet user
  document.getElementById("user-display").innerText = `Welcome, ${ownerName}`;

  // Update header and tagline
  document.querySelector(".title-block h1").innerText = "Food Stall Billing";
  document.querySelector(".title-block .tagline").innerText = "A SAAS product by Tech Innovators";

  renderMenu();
  renderBill();
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
  const ownerName = document.getElementById("owner-name").value;
  const hotelAddress = document.getElementById("hotel-address").value;

  if (!ownerName || !hotelAddress) {
    return alert("Please enter owner name and hotel address.");
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return alert("Login failed: " + error.message);

  currentUser = data.user;

  // Save the info for greeting and printing only
  currentUser.profile = {
    ownerName,
    hotelAddress
  };
  localStorage.setItem("userProfile", JSON.stringify(currentUser.profile));


  showApp();
  await loadMenuFromDB();
}


async function logout() {
  await supabaseClient.auth.signOut();
  showLogin();
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
  await renderMenuEditList();
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
    date: date.toLocaleDateString("en-GB"),
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
    .eq("user_id", currentUser.id); // 🚫 no date filter

  console.log("SALES FOUND:", data);

  return data || [];
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


function filterMenu() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    const name = item.querySelector("div").innerText.toLowerCase();
    item.style.display = name.includes(query) ? "block" : "none";
  });
}

async function prepareAndPrint() {
  const date = new Date();
  const billNo = await getAndIncrementBillNo();
  const current = {
    billNo,
    date: date.toLocaleDateString("en-GB"),

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
    // localStorage.setItem("billNo", ++billNo);
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

async function sendToPrinter(raw) {
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
      console.warn("Bluetooth print failed:", err);
      printerDevice = null;
      printerCharacteristic = null;
    }
  }

  alert("Failed to print summary — check printer connection.");
}


function buildEscPosCommands(current) {
    const { billNo, date, time, items, total } = current;
    let cmds = "";
    cmds += "\x1B\x40";
    cmds += "\x1B\x61\x01";
    const { ownerName, hotelAddress } = currentUser.profile;
    cmds += `\n${hotelAddress}\n`;
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





async function getAndIncrementBillNo() {
  const { data, error } = await supabaseClient
    .from('user_counters')
    .select('bill_no')
    .eq('user_id', currentUser.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row exists yet, create it
    await supabaseClient.from('user_counters').insert([
      { user_id: currentUser.id, bill_no: 2 }
    ]);
    return 1;
  } else if (error) {
    alert("Failed to get bill number: " + error.message);
    return 1;
  } else {
    // Update and return current
    await supabaseClient
      .from('user_counters')
      .update({ bill_no: data.bill_no + 1 })
      .eq('user_id', currentUser.id);

    return data.bill_no;
  }
}
async function exportSalesReport() {
  console.log("Export function triggered!");

  const jsPDF = window.jspdf.jsPDF;
  const rangeSelect = document.getElementById("report-range");
  if (!rangeSelect) {
    console.error("report-range select not found!");
    return;
  }

  const range = rangeSelect.value;
  console.log("Range selected:", range);

  let startDateStr, endDateStr;
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;

  if (range === "today") {
    startDateStr = endDateStr = todayStr;
  } else if (range === "7days" || range === "30days") {
    const days = range === "7days" ? 6 : 29;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const sdd = String(startDate.getDate()).padStart(2, '0');
    const smm = String(startDate.getMonth() + 1).padStart(2, '0');
    const syyyy = startDate.getFullYear();
    startDateStr = `${sdd}/${smm}/${syyyy}`;
    endDateStr = todayStr;
  } else if (range === "custom") {
    const startInput = document.getElementById("report-start").value;
    const endInput = document.getElementById("report-end").value;
    if (!startInput || !endInput) return alert("Please select both dates.");
    const [sy, sm, sd] = startInput.split("-");
    const [ey, em, ed] = endInput.split("-");
    startDateStr = `${sd}/${sm}/${sy}`;
    endDateStr = `${ed}/${em}/${ey}`;
  }

  const { data, error } = await supabaseClient
    .from("user_sales")
    .select("*")
    .eq("user_id", currentUser.id);

  if (error) {
    alert("Failed to fetch sales: " + error.message);
    return;
  }

  console.log("Sales fetched:", data.length);

  const filteredSales = data.filter(sale => sale.date === startDateStr || sale.date === endDateStr);


  console.log("Filtered sales:", filteredSales.length);

  if (!filteredSales.length) {
    alert("No sales found in selected range.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Sales Report", 14, 20);

  const rows = filteredSales.map(s => {
    const items = s.items.map(i => `${i.name} x${i.qty}`).join(", ");
    return [s.bill_no, s.date, s.time, `₹${s.total}`, items];
  });
  const totalBills = filteredSales.length;
const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);

// Colored Total Bills Box
doc.setFillColor(63, 81, 181); // Indigo
doc.setTextColor(255);
doc.rect(14, 30, 90, 10, 'F');
doc.setFontSize(11);
doc.text(`Total Bills: ${totalBills}`, 16, 37);

// Colored Total Revenue Box
doc.setFillColor(0, 150, 136); // Teal
doc.rect(110, 30, 90, 10, 'F');
doc.setTextColor(255);
doc.text(`Total Revenue: ${totalRevenue.toLocaleString("en-IN")}`, 112, 37);


doc.autoTable({
  startY: 45,
  head: [["Bill No", "Date", "Time", "Total", "Items"]],
  body: filteredSales.map(s => {
    const items = s.items.map(i => `${i.name} x${i.qty}`).join(", ");
    return [s.bill_no, s.date, s.time, `${s.total}`, items];
  }),
  styles: { fontSize: 9, cellPadding: 3 },
  columnStyles: {
    0: { cellWidth: 20 },   // Bill No
    1: { cellWidth: 25 },   // Date
    2: { cellWidth: 25 },   // Time
    3: { cellWidth: 25 },   // Total
    4: { cellWidth: 'auto' } // Items - allow it to wrap
  },
  headStyles: {
    fillColor: [30, 136, 229],
    textColor: 255,
    fontStyle: 'bold'
  },
  theme: 'striped',
  didDrawCell: (data) => {
    // Optional: highlight total row or handle large text wrapping
  }
});



  const labelStart = startDateStr.replace(/\//g, "-");
  const labelEnd = endDateStr.replace(/\//g, "-");
  doc.save(`sales_report_${labelStart}_to_${labelEnd}.pdf`);
}
function handleDateRangeChange() {
  const range = document.getElementById("report-range").value;
  const customInputs = document.getElementById("custom-date-inputs");
  customInputs.style.display = (range === "custom") ? "block" : "none";
}
async function printSalesSummary() {
  const rangeSelect = document.getElementById("report-range").value;

  // Get date range
  let startDateStr, endDateStr;
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;

  if (rangeSelect === "today") {
    startDateStr = endDateStr = todayStr;
  } else if (rangeSelect === "7days" || rangeSelect === "30days") {
    const days = rangeSelect === "7days" ? 6 : 29;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const sdd = String(startDate.getDate()).padStart(2, '0');
    const smm = String(startDate.getMonth() + 1).padStart(2, '0');
    const syyyy = startDate.getFullYear();
    startDateStr = `${sdd}/${smm}/${syyyy}`;
    endDateStr = todayStr;
  } else if (rangeSelect === "custom") {
    const startInput = document.getElementById("report-start").value;
    const endInput = document.getElementById("report-end").value;
    if (!startInput || !endInput) return alert("Please select both dates.");
    const [sy, sm, sd] = startInput.split("-");
    const [ey, em, ed] = endInput.split("-");
    startDateStr = `${sd}/${sm}/${sy}`;
    endDateStr = `${ed}/${em}/${ey}`;
  }

  const { data, error } = await supabaseClient
    .from("user_sales")
    .select("*")
    .eq("user_id", currentUser.id);

  if (error) {
    alert("Failed to fetch sales: " + error.message);
    return;
  }

  // Filter by date range
  const parseDate = d => {
    const [dd, mm, yyyy] = d.split("/");
    return new Date(`${yyyy}-${mm}-${dd}`);
  };
  const sales = data.filter(s => {
    const date = parseDate(s.date);
    return date >= parseDate(startDateStr) && date <= parseDate(endDateStr);
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalBills = sales.length;

  const summaryText = {
    dateRange: `${startDateStr} to ${endDateStr}`,
    totalBills,
    totalRevenue
  };

  const raw = buildSalesSummaryEscPos(summaryText);
  await sendToPrinter(raw);
}

function buildSalesSummaryEscPos(summary) {
  const { dateRange, totalBills, totalRevenue } = summary;
  let cmds = "";
  cmds += "\x1B\x40";  // Initialize
  cmds += "\x1B\x61\x01";  // Center
  const { ownerName, hotelAddress } = currentUser.profile;
  cmds += `${ownerName.toUpperCase()}\n${hotelAddress}\n`;
  cmds += "SALES SUMMARY REPORT\n";
  cmds += "\x1B\x61\x00";  // Left align
  cmds += "-----------------------------\n";
  cmds += `Range: ${dateRange}\n`;
  cmds += `Total Bills : ${totalBills}\n`;
  cmds += `Total Revenue: ${totalRevenue}\n`;
  cmds += "-----------------------------\n";
  cmds += "Thank You! Keep Selling \n";
  cmds += "Software by Tech Innovators\n";
  cmds += "\n\n\n";
  cmds += "\x1D\x56\x41"; // Cut
  return cmds;
}
async function updateMenuItem(id) {
  const nameInput = document.getElementById(`name-${id}`);
  const priceInput = document.getElementById(`price-${id}`);
  const newName = nameInput.value;
  const newPrice = parseFloat(priceInput.value);

  const { error } = await supabaseClient
    .from("user_menu")
    .update({ name: newName, price: newPrice })
    .eq("id", id);

  if (error) return alert("Failed to update item: " + error.message);
  alert("Item updated!");
  await loadMenuFromDB();
  await renderMenuEditList();
}

async function deleteMenuItem(id) {
  const confirmDelete = confirm("Are you sure you want to delete this item?");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("user_menu")
    .delete()
    .eq("id", id);

  if (error) return alert("Failed to delete item: " + error.message);
  alert("Item deleted!");
  await loadMenuFromDB();
  await renderMenuEditList();
}
