/**
 * Blood Group Admin Panel — Unified Layout Component v4.0
 * --------------------------------------------------------
 * Injects Sidebar, Top Navbar, Footer, and Role Guard.
 */

// ── RoleGuard ────────────────────────────────────────────
window.DeploymentRoutes = window.DeploymentRoutes || {
    normalize(value) {
        return value ? value.replace(/\/$/, '') : '';
    },
    adminApiBase() {
        const configured = this.normalize(window.BLOODGROUP_CONFIG && window.BLOODGROUP_CONFIG.adminApiBase);
        return configured || this.normalize(new URL('../../backend/api/', window.location.href).toString());
    },
    exportLogsUrl() {
        return `${this.adminApiBase()}/export_logs.php`;
    }
};

window.RoleGuard = {
    getRole() {
        try {
            const s = localStorage.getItem('adminSession');
            if (s) { const p = JSON.parse(s); return (p.role || '').toLowerCase(); }
        } catch(e) {}
        // Fallback: cookie or data attribute
        const meta = document.querySelector('meta[name="user-role"]');
        return meta ? meta.content.toLowerCase() : 'admin';
    },
    isSuperAdmin() { return this.getRole() === 'super_admin' || this.getRole() === 'superadmin'; },
    apply() {
        const role = this.getRole();
        document.body.dataset.role = role;
        // Elements with data-superadmin are only visible to super_admin
        document.querySelectorAll('[data-superadmin]').forEach(el => {
            if (!this.isSuperAdmin()) {
                el.style.display = 'none';
            }
        });
        // Update role badge in navbar
        const badge = document.getElementById('user-role');
        if (badge) badge.textContent = this.isSuperAdmin() ? 'Super Admin' : 'Admin';
    }
};

// ── Auth ─────────────────────────────────────────────────
window.Auth = {
    async logout() {
        if (!confirm('Are you sure you want to logout?')) return;
        try {
            await fetch(`${window.DeploymentRoutes.adminApiBase()}/auth.php?action=logout`, { credentials: 'include' });
        } catch(e) { /* Silent */ }
        localStorage.removeItem('adminSession');
        window.location.href = 'login.html';
    }
};

// ── Notification Store (demo) ─────────────────────────────
window.NotifStore = {
    items: [
        { id: 1, type: 'critical', msg: 'O- blood stock critically low (3 units remaining)', time: '2m ago', read: false },
        { id: 2, type: 'warning',  msg: 'A+ stock below threshold — 8 units left',           time: '15m ago', read: false },
        { id: 3, type: 'info',     msg: 'New donor request from Regional Hospital',           time: '1h ago', read: false },
        { id: 4, type: 'success',  msg: 'Blood stock replenishment completed for B+',         time: '3h ago', read: true  },
    ],
    unreadCount() { return this.items.filter(i => !i.read).length; },
    markAllRead() { this.items.forEach(i => i.read = true); }
};

const EnterpriseLayout = {
    init() {
        this.renderSidebar();
        this.renderNavbar();
        this.renderFooter();
        this.highlightActiveLink();
        this.initSidebarToggle();
        this.initNotifications();
        RoleGuard.apply();
        if(window.Toast) window.Toast.init();
    },

    renderSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const isSA = RoleGuard.isSuperAdmin();

        sidebar.innerHTML = `
            <div class="sidebar-header px-6 py-7 flex-shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                        </svg>
                    </div>
                    <div class="nav-text truncate">
                        <h2 class="text-lg font-black text-slate-900 dark:text-white leading-none">BloodAdmin</h2>
                        <span class="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Blood Bank v4.0</span>
                    </div>
                </div>
            </div>

            <nav class="flex-1 px-4 overflow-y-auto space-y-0.5 pb-4">
                <!-- Overview -->
                <div class="px-4 pb-2 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest nav-text">Overview</div>

                <a href="dashboard.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 group">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    <span class="nav-text whitespace-nowrap">Dashboard</span>
                </a>

                <a href="analytics.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <span class="nav-text whitespace-nowrap">Analytics</span>
                </a>

                <!-- Blood Bank -->
                <div class="px-4 pb-2 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest nav-text border-t border-slate-100 dark:border-slate-800 mt-2">Blood Bank</div>

                <a href="blood-records.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    <span class="nav-text whitespace-nowrap font-semibold text-blue-500">Blood Records</span>
                    <span class="ml-auto nav-text px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded uppercase tracking-wider">New</span>
                </a>

                <a href="genetic-analysis.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
                    <span class="nav-text whitespace-nowrap text-indigo-500 font-semibold">Clinical Analysis</span>
                </a>

                <a href="calculations.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span class="nav-text whitespace-nowrap">Calculations</span>
                </a>

                <!-- Prediction System -->
                <div class="px-4 pb-2 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest nav-text border-t border-slate-100 dark:border-slate-800 mt-2">Prediction System</div>

                <a data-superadmin href="predictor-superadmin.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                    <span class="nav-text whitespace-nowrap text-blue-500 font-semibold">Algorithm Health</span>
                    <span class="ml-auto nav-text px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded uppercase tracking-wider">SA</span>
                </a>

                <a href="predictor-admin.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <span class="nav-text whitespace-nowrap text-slate-600 dark:text-slate-300 font-semibold">Prediction Analytics</span>
                </a>

                <!-- Management -->
                <div class="px-4 pb-2 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest nav-text border-t border-slate-100 dark:border-slate-800 mt-2">Management</div>

                <a href="users.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    <span class="nav-text whitespace-nowrap">User Management</span>
                </a>

                <a href="billing.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    <span class="nav-text whitespace-nowrap">Billing</span>
                </a>

                <a href="logs.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span class="nav-text whitespace-nowrap">Prediction Logs</span>
                </a>

                <a data-superadmin href="security.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    <span class="nav-text whitespace-nowrap">Security & Monitoring</span>
                    <span class="ml-auto nav-text px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded uppercase tracking-wider">SA</span>
                </a>

                <!-- Insights -->
                <div class="px-4 pb-2 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest nav-text border-t border-slate-100 dark:border-slate-800 mt-2">Insights & Config</div>

                <a href="ai-insights.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <span class="nav-text whitespace-nowrap text-blue-500 font-semibold">AI Insights</span>
                </a>

                <a href="knowledge.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    <span class="nav-text whitespace-nowrap">Knowledge Base</span>
                </a>

                <a href="reports.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span class="nav-text whitespace-nowrap">Reports</span>
                </a>

                <a href="profile.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span class="nav-text whitespace-nowrap">Admin Profile</span>
                </a>

                <a href="settings.html" class="sidebar-link flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-medium transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400">
                    <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span class="nav-text whitespace-nowrap">Settings</span>
                </a>
            </nav>

            <div class="px-4 py-5 mt-auto border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
                <button onclick="Auth.logout()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold rounded-xl transition-all hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm">
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    <span class="nav-text font-bold">Logout</span>
                </button>
            </div>
        `;
    },

    renderNavbar() {
        const main = document.querySelector('main');
        if (!main) return;

        const unread = NotifStore.unreadCount();

        const navbar = document.createElement('header');
        navbar.className = 'sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800';
        navbar.innerHTML = `
            <div class="flex items-center gap-3">
                <button class="mobile-toggle lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                </button>
                <button id="desktop-sidebar-toggle" class="hidden lg:flex p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" title="Toggle Sidebar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/></svg>
                </button>
                <div class="hidden lg:flex items-center gap-2 text-slate-300 dark:text-slate-600">
                    <svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                </div>
                <h2 id="page-title" class="text-base font-bold text-slate-800 dark:text-white"></h2>
            </div>

            <div class="flex items-center gap-2">
                <!-- Search -->
                <div class="relative hidden sm:block">
                    <input type="text" placeholder="Search donors, records..." class="w-56 pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm text-slate-800 dark:text-white placeholder-slate-400">
                    <svg class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>

                <!-- Theme Toggle -->
                <button onclick="ThemeManager.toggle()" class="theme-toggle-btn w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:scale-110 transition-all text-slate-600 dark:text-slate-300"></button>

                <!-- Notification Bell -->
                <div class="relative">
                    <button id="notif-bell" class="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:scale-110 transition-all text-slate-600 dark:text-slate-300 relative">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                        ${unread > 0 ? `<span id="notif-badge" class="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">${unread}</span>` : ''}
                    </button>
                    <!-- Notification Dropdown -->
                    <div id="notif-dropdown" class="hidden absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h4 class="font-bold text-slate-800 dark:text-white text-sm">Notifications</h4>
                            <button id="mark-all-read" class="text-xs text-blue-500 font-bold hover:underline">Mark all read</button>
                        </div>
                        <div class="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto" id="notif-list">
                            ${NotifStore.items.map(n => `
                                <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer ${n.read ? 'opacity-60' : ''}">
                                    <div class="flex gap-3 items-start">
                                        <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                                            n.type==='critical' ? 'bg-blue-100 text-blue-600' :
                                            n.type==='warning'  ? 'bg-amber-100 text-amber-600' :
                                            n.type==='success'  ? 'bg-blue-100 text-blue-600' :
                                                                   'bg-blue-100 text-blue-600'
                                        }">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                                                n.type==='critical'||n.type==='warning'
                                                    ? 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                                    : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                                            }"/></svg>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">${n.msg}</p>
                                            <p class="text-[10px] text-slate-400 mt-1">${n.time}</p>
                                        </div>
                                        ${!n.read ? '<div class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></div>' : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                            <button class="text-xs text-slate-500 hover:text-blue-500 font-bold transition-all">View all notifications</button>
                        </div>
                    </div>
                </div>

                <!-- Profile -->
                <div class="flex items-center gap-2.5 pl-3 border-l border-slate-200 dark:border-slate-800 ml-1">
                    <div class="text-right hidden md:block">
                        <p id="user-name" class="text-sm font-bold text-slate-900 dark:text-white leading-none">Admin User</p>
                        <p id="user-role" class="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Super Admin</p>
                    </div>
                    <div class="w-9 h-9 bg-gradient-to-tr from-blue-600 to-teal-400 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200/50">A</div>
                </div>
            </div>
        `;
        main.insertBefore(navbar, main.firstChild);
    },

    initNotifications() {
        document.addEventListener('click', e => {
            const bell = e.target.closest('#notif-bell');
            const dropdown = document.getElementById('notif-dropdown');
            const markRead = e.target.closest('#mark-all-read');

            if (bell && dropdown) {
                dropdown.classList.toggle('hidden');
                return;
            }
            if (markRead) {
                NotifStore.markAllRead();
                const badge = document.getElementById('notif-badge');
                if (badge) badge.remove();
                document.querySelectorAll('#notif-list > div').forEach(d => d.classList.add('opacity-60'));
                document.querySelectorAll('#notif-list .w-2.h-2.rounded-full').forEach(d => d.remove());
                return;
            }
            if (dropdown && !e.target.closest('#notif-bell') && !e.target.closest('#notif-dropdown')) {
                dropdown.classList.add('hidden');
            }
        });
    },

    initSidebarToggle() {
        if (localStorage.getItem('sidebarMin') === '1') {
            document.body.classList.add('sidebar-minimized');
        }
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('#desktop-sidebar-toggle');
            if (btn) {
                const isMin = document.body.classList.toggle('sidebar-minimized');
                localStorage.setItem('sidebarMin', isMin ? '1' : '0');
            }
            const mobileBtn = e.target.closest('.mobile-toggle');
            if (mobileBtn) {
                document.querySelector('.sidebar')?.classList.toggle('open');
            }
        });
    },

    renderFooter() {
        const main = document.querySelector('main');
        if (!main) return;

        const footer = document.createElement('footer');
        footer.className = 'mt-auto px-8 py-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3';
        footer.innerHTML = `
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                © 2026 BloodGroup Admin Panel. <span class="text-blue-500 font-bold">Secure · Reliable · Scalable.</span>
            </p>
            <div class="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Engine v4.0</span>
                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>RBAC Active</span>
                <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                <span class="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md">Stable</span>
            </div>
        `;
        main.appendChild(footer);
    },

    highlightActiveLink() {
        const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
        document.querySelectorAll('.sidebar-link').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active', 'bg-blue-50', 'dark:bg-blue-900/20', 'text-blue-600', 'dark:text-blue-400', 'font-semibold');
                const title = document.getElementById('page-title');
                if (title) {
                    const textSpan = link.querySelector('.nav-text');
                    title.innerText = textSpan ? textSpan.innerText.trim() : link.innerText.trim();
                }
            }
        });
    }
};

// ── Toast Notification System ──────────────────────────────
window.Toast = {
    init() {
        if (document.getElementById('toast-container')) return;
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    },
    trigger(type, message) {
        this.init();
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        let icon, colors;
        switch(type) {
            case 'success': 
                icon = '<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                colors = 'bg-white dark:bg-slate-800 border-l-4 border-emerald-500 text-slate-800 dark:text-white';
                break;
            case 'error':
                icon = '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
                colors = 'bg-white dark:bg-slate-800 border-l-4 border-red-500 text-slate-800 dark:text-white';
                break;
            default: // info
                icon = '<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
                colors = 'bg-white dark:bg-slate-800 border-l-4 border-blue-500 text-slate-800 dark:text-white';
        }

        toast.className = `flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl pointer-events-auto transform translate-y-20 opacity-0 transition-all duration-300 ${colors}`;
        toast.innerHTML = `<div class="flex-shrink-0">${icon}</div><div class="text-sm font-bold text-slate-700 dark:text-slate-300">${message}</div>`;
        
        container.appendChild(toast);
        
        // Slide up animation tick
        setTimeout(() => toast.classList.remove('translate-y-20', 'opacity-0'), 10);
        
        // Auto exit
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
};

document.addEventListener('DOMContentLoaded', () => EnterpriseLayout.init());
