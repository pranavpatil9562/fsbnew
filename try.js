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
