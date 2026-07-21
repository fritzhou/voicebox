const SUPABASE_URL = "https://qahcgyynrikbwsgqiufm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhaGNneXlucmlrYndzZ3FpdWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjcwMDUsImV4cCI6MjA5OTU0MzAwNX0.4iLnF4HHAMNf0TFV5jgkhxYqdopl5KrlopiJvPLlg1E";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Shows a small floating toast message, reused across all pages.
function showToast(message, duration = 3200) {
  let toast = document.getElementById("vb-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vb-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), duration);
}

// Toggles a button between normal and loading state. Expects the
// button to contain a <span class="btn-label"> and a spinner div.
function setButtonLoading(button, isLoading, loadingText) {
  const label = button.querySelector(".btn-label");
  const spinner = button.querySelector(".spinner");
  if (isLoading) {
    button.disabled = true;
    if (spinner) spinner.classList.add("show");
    if (label && loadingText) label.textContent = loadingText;
  } else {
    button.disabled = false;
    if (spinner) spinner.classList.remove("show");
  }
}

// Updates the nav bar's account link based on current session -
// shows "Log In" for guests, or the student's email once logged in.
async function refreshNavAccountLink() {
  const accountLink = document.getElementById("navAccountLink");
  if (!accountLink) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    accountLink.textContent = "My Account";
    accountLink.href = "profile.html";
  } else {
    accountLink.textContent = "Log In";
    accountLink.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", refreshNavAccountLink);
