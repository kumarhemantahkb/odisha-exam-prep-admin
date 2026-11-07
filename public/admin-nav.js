// Odisha Exam Prep - Unified Admin Navigation & UI Controller
import { auth } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Global SweetAlert2 notification helpers
window.showToast = function(message, icon = 'success') {
    if (window.Swal) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: icon,
            title: message
        });
    } else {
        alert(message);
    }
};

window.showAlert = function(title, text, icon = 'info') {
    if (window.Swal) {
        return Swal.fire({
            title: title,
            text: text,
            icon: icon,
            confirmButtonColor: '#4f46e5'
        });
    } else {
        alert(`${title}: ${text}`);
        return Promise.resolve();
    }
};

window.showConfirm = function(title, text, confirmButtonText = 'Yes, Proceed') {
    if (window.Swal) {
        return Swal.fire({
            title: title,
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#ef4444',
            confirmButtonText: confirmButtonText,
            cancelButtonText: 'Cancel'
        }).then((result) => result.isConfirmed);
    } else {
        return Promise.resolve(confirm(`${title}\n${text}`));
    }
};

// Sidebar Configuration
const navConfig = [
    {
        section: "Overview",
        items: [
            { href: "dashboard.html", label: "Dashboard", icon: "fas fa-chart-pie" }
        ]
    },
    {
        section: "Exam & Content",
        items: [
            { href: "admin.html", label: "Create Test Header", icon: "fas fa-plus-circle" },
            { href: "upload.html", label: "Upload Questions (Excel)", icon: "fas fa-file-excel" },
            { href: "edit_questions.html", label: "Manage / Edit Questions", icon: "fas fa-pencil-alt" },
            { href: "manage_subjects.html", label: "Categories & Subjects", icon: "fas fa-folder-tree" }
        ]
    },
    {
        section: "AI & Smart Tools",
        items: [
            { href: "ai_generator.html", label: "AI Generate & Auto-Upload", icon: "fas fa-wand-magic-sparkles" },
            { href: "ai_extractor.html", label: "AI Extract from PDF/Image", icon: "fas fa-file-invoice" },
            { href: "ai_text_formatter.html", label: "AI Text Formatter", icon: "fas fa-align-left" },
            { href: "smart_paste.html", label: "Smart Table Paste", icon: "fas fa-paste" },
            { href: "test_assembler.html", label: "Test Assembler", icon: "fas fa-layer-group" }
        ]
    },
    {
        section: "Community & Users",
        items: [
            { href: "users.html", label: "User Management", icon: "fas fa-users-gear" },
            { href: "payments.html", label: "Payments & Recovery 💳", icon: "fas fa-credit-card" },
            { href: "messaging.html", label: "Promotions & Notices 🎯", icon: "fas fa-bullhorn" }
        ]
    }
];

export function renderAdminLayout({ pageTitle, pageSubtitle, pageIcon, activeNav }) {
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const activeKey = activeNav || currentPath;

    // 1. Render Sidebar
    const sidebarEl = document.getElementById("appSidebar");
    if (sidebarEl) {
        let navHtml = `
        <div class="p-5 flex items-center justify-between border-b border-slate-800">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <div>
                    <h2 class="text-base font-bold text-white tracking-tight leading-tight">Odisha Exam Prep</h2>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="live-pulse"></span>
                        <p class="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Admin Portal Pro</p>
                    </div>
                </div>
            </div>
            <!-- Mobile Close Button -->
            <button id="mobileCloseBtn" class="md:hidden text-slate-400 hover:text-white p-1.5 rounded-lg focus:outline-none">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>

        <nav class="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-4">
        `;

        navConfig.forEach(section => {
            navHtml += `<div>
                <p class="nav-section-title">${section.section}</p>
                <div class="space-y-0.5">`;

            section.items.forEach(item => {
                const isActive = activeKey === item.href || (activeKey.endsWith(item.href));
                navHtml += `
                <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}">
                    <i class="${item.icon}"></i>
                    <span>${item.label}</span>
                </a>`;
            });

            navHtml += `</div></div>`;
        });

        navHtml += `
        </nav>

        <div class="p-3 border-t border-slate-800 bg-slate-950/40">
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                <div class="flex items-center gap-2.5 overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=4F46E5&color=fff&bold=true" alt="Admin" class="w-8 h-8 rounded-lg shrink-0 border border-indigo-400/30">
                    <div class="truncate">
                        <p class="text-xs font-semibold text-white truncate">Super Admin</p>
                        <p class="text-[10px] text-slate-400 truncate">admin@odishaexam.in</p>
                    </div>
                </div>
                <button id="sidebarLogoutBtn" title="Logout" class="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                    <i class="fas fa-sign-out-alt text-sm"></i>
                </button>
            </div>
        </div>
        `;

        sidebarEl.innerHTML = navHtml;
    }

    // 2. Render Topbar Header
    const headerEl = document.getElementById("appHeader");
    if (headerEl) {
        headerEl.innerHTML = `
        <div class="flex items-center gap-3">
            <button id="mobileMenuBtn" class="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none">
                <i class="fas fa-bars text-lg"></i>
            </button>
            <div>
                <h1 class="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2.5 leading-tight">
                    <span class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm shadow-sm border border-indigo-100">
                        <i class="${pageIcon || 'fas fa-border-all'}"></i>
                    </span>
                    ${pageTitle || 'Admin Panel'}
                </h1>
                ${pageSubtitle ? `<p class="text-xs text-slate-500 hidden sm:block mt-0.5">${pageSubtitle}</p>` : ''}
            </div>
        </div>

        <div class="flex items-center gap-3 md:gap-4">
            <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <span class="live-pulse"></span>
                <span>Firebase Connected</span>
            </div>

            <a href="https://console.firebase.google.com/project/odisha-exam-prep-7ee0b/firestore" target="_blank" rel="noopener noreferrer" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors shadow-sm">
                <i class="fas fa-database text-amber-500"></i>
                <span>Console</span>
            </a>

            <button id="topLogoutBtn" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 text-xs font-semibold transition-all shadow-sm">
                <i class="fas fa-sign-out-alt"></i>
                <span class="hidden sm:inline">Logout</span>
            </button>
        </div>
        `;
    }

    // Attach Mobile Drawer Events
    setupMobileDrawer();

    // Attach Logout Events
    setupLogoutHandlers();
}

function setupMobileDrawer() {
    const sidebar = document.getElementById("appSidebar");
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const closeBtn = document.getElementById("mobileCloseBtn");
    const overlay = document.getElementById("mobileOverlay");

    function openSidebar() {
        if (sidebar) sidebar.classList.remove("-translate-x-full");
        if (overlay) overlay.classList.remove("hidden");
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.add("-translate-x-full");
        if (overlay) overlay.classList.add("hidden");
    }

    if (mobileBtn) mobileBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay) overlay.addEventListener("click", closeSidebar);
}

function setupLogoutHandlers() {
    const performLogout = async () => {
        const confirmed = await window.showConfirm("Are you sure you want to log out?", "You will need to sign in again to access the admin panel.", "Yes, Logout");
        if (confirmed) {
            try {
                await signOut(auth);
                window.location.replace("index.html");
            } catch (err) {
                window.showAlert("Logout Error", err.message, "error");
            }
        }
    };

    const topBtn = document.getElementById("topLogoutBtn");
    const sideBtn = document.getElementById("sidebarLogoutBtn");
    const legacyBtn = document.getElementById("logoutBtn");

    if (topBtn) topBtn.addEventListener("click", performLogout);
    if (sideBtn) sideBtn.addEventListener("click", performLogout);
    if (legacyBtn) legacyBtn.addEventListener("click", performLogout);
}

// Global Auth Guard
export function initAuthGuard() {
    onAuthStateChanged(auth, (user) => {
        const mainBody = document.getElementById("mainBody");
        if (user) {
            if (mainBody) {
                mainBody.style.display = "flex";
                mainBody.classList.remove("opacity-0");
            }
        } else {
            window.location.replace("index.html");
        }
    });
}
