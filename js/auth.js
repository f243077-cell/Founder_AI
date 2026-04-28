import { auth, provider, isDemoMode, signInWithPopup, onAuthStateChanged } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('google-login-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            if (isDemoMode) {
                window.location.href = '/dashboard.html';
                return;
            }
            try {
                await signInWithPopup(auth, provider);
                window.location.href = '/dashboard.html';
            } catch (error) {
                if (error.code === 'auth/popup-closed-by-user') return;
                if (error.code === 'auth/configuration-not-found' || error.code === 'auth/invalid-api-key') {
                    window.location.href = '/dashboard.html';
                } else {
                    alert('Login failed: ' + (error.message || 'Unknown error'));
                }
            }
        });
    }

    // Auto-redirect if already logged in (only on landing page)
    const path = window.location.pathname;
    if ((path === '/' || path === '/index.html') && !isDemoMode) {
        onAuthStateChanged(auth, (user) => {
            if (user) window.location.href = '/dashboard.html';
        });
    }
});
