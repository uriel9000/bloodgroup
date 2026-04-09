/**
 * Blood Group Predictor Enterprise - Theme Management
 * --------------------------------------------------
 * Handles Light/Dark mode switching and persistence.
 */

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('admin-theme') || 'light';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('admin-theme', theme);
        
        // Update any toggles in the UI
        const toggles = document.querySelectorAll('.theme-toggle-btn');
        toggles.forEach(btn => {
            btn.innerHTML = theme === 'dark' ? '🌙' : '☀️';
        });
    },

    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
};

// Initialize on load
ThemeManager.init();

window.ThemeManager = ThemeManager;
