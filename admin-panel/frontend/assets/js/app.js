/**
 * Blood Group Predictor V3 - Main Application Entry
 */
import { API } from './api.js';

// Global state / Store
export const Store = {
    user: null,
    isDrawerOpen: false,
    
    toggleDrawer(open) {
        const drawer = document.getElementById('ai-drawer');
        if (open === undefined) open = drawer.classList.contains('closed');
        
        if (open) {
            drawer.classList.remove('closed');
        } else {
            drawer.classList.add('closed');
        }
        this.isDrawerOpen = open;
    },

    toggleSidebar(open) {
        const sidebar = document.querySelector('.sidebar');
        if (open === undefined) open = !sidebar.classList.contains('open');
        
        if (open) {
            sidebar.classList.add('open');
        } else {
            sidebar.classList.remove('open');
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin V3 Initialized');
    
    // Check if on login page
    if (window.location.pathname.includes('login.html')) return;
    
    // Bind global events
    document.querySelectorAll('[data-toggle-drawer]').forEach(btn => {
        btn.onclick = () => Store.toggleDrawer();
    });

    document.querySelectorAll('[data-toggle-sidebar]').forEach(btn => {
        btn.onclick = () => Store.toggleSidebar();
    });
});
