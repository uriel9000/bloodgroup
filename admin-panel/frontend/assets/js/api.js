/**
 * Blood Group Predictor V3 - API Helper Layer
 */

function normalizeBaseUrl(value) {
    return value ? value.replace(/\/$/, '') : '';
}

function getDefaultAdminApiBase() {
    return normalizeBaseUrl(new URL('../../backend/api/', window.location.href).toString());
}

export const API = {
    baseUrl: normalizeBaseUrl((window.BLOODGROUP_CONFIG && window.BLOODGROUP_CONFIG.adminApiBase) || getDefaultAdminApiBase()),

    async fetch(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}/${endpoint}`;
        console.log('API Request:', url);

        const response = await fetch(url, {
            credentials: 'include',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 401) {
            console.warn('401 Unauthorized - Redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) {
            let errorMsg = 'Server Error';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                console.error('Failed to parse error response as JSON');
                errorMsg = `HTTP ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }

        return response.json();
    },

    auth: {
        login: (email, password, deviceData) => API.fetch('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ email, password, ...deviceData })
        }),
        logout: () => API.fetch('auth.php?action=logout')
    },

    stats: {
        getOverview: () => API.fetch('stats.php')
    },

    calculations: {
        list: (page = 1, search = '') => API.fetch(`calculations.php?page=${page}&search=${search}`),
        delete: id => API.fetch(`calculations.php?id=${id}`, { method: 'DELETE' }),
        analyze: (parent1, parent2) => API.fetch('calculations/analyze.php', {
            method: 'POST',
            body: JSON.stringify({ parent1, parent2 })
        })
    },

    settings: {
        get: () => API.fetch('settings.php'),
        save: data => API.fetch('settings.php', { method: 'POST', body: JSON.stringify(data) })
    },

    profile: {
        get: () => API.fetch('profile/get.php'),
        update: data => API.fetch('profile/update.php', { method: 'POST', body: JSON.stringify(data) })
    },

    ai: {
        clinical: (parent1, parent2) => API.fetch('ai/clinical.php', {
            method: 'POST',
            body: JSON.stringify({ parent1, parent2 })
        }),
        explain: (parents, results) => API.fetch('ai/explain.php', {
            method: 'POST',
            body: JSON.stringify({ parents, results })
        }),
        insights: data => API.fetch('ai/insights.php', {
            method: 'POST',
            body: JSON.stringify({ data })
        }),
        recommend: () => API.fetch('ai/recommend.php', { method: 'POST' }),
        generate: (type, data, refresh = false) => API.fetch('ai/gemini.php', {
            method: 'POST',
            body: JSON.stringify({ type, data, refresh })
        })
    },

    security: {
        logs: () => API.fetch('security/logs.php')
    }
};
