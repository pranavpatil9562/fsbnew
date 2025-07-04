// supabase_app.js — ENHANCED WITH MISSING FEATURES FROM LOCAL VERSION

const SUPABASE_URL = 'https://givvsxoytchsdcxvyxud.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdnZzeG95dGNoc2RjeHZ5eHVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzU4MTYsImV4cCI6MjA2NzIxMTgxNn0.GX8xGEuhnfJmxoxk5-7B8E5eLdLwLazXUyq_arx-NuQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let items = [];
let selectedItems = [];
let billNo = 1;

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
  updateDashboard();
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

async function addMenuItem(userId, name, price, image) {
  const { error } = await supabaseClient.from("user_menu").insert([
    { user_id: userId, name, price, image }
  ]);
  if (error) alert("Menu add failed:", error.message);
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
  updateDashboard();
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

async function updateDashboard() {
  const today = new Date();
  const start = new Date(today.setHours(0, 0, 0, 0));
  const end = new Date(today.setHours(23, 59, 59, 999));
  const salesToday = await getSalesInRange(start, end);
  const totalSales = salesToday.reduce((sum, sale) => sum + sale.total, 0);
  const totalQty = salesToday.reduce((sum, sale) => sum + sale.items.reduce((s, i) => s + i.qty, 0), 0);
  const totalBills = salesToday.length;
  document.getElementById("dash-total-sales").innerText = `₹${totalSales}`;
  document.getElementById("dash-total-qty").innerText = `${totalQty}`;
  document.getElementById("dash-total-bills").innerText = `${totalBills}`;
}

function filterMenu() {
  const query = document.getElementById("search-bar").value.toLowerCase();
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach(item => {
    const name = item.querySelector("div").innerText.toLowerCase();
    item.style.display = name.includes(query) ? "block" : "none";
  });
}
