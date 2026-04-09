/**
 * Blood Group Predictor - Billing Dashboard Logic
 * File: /admin-panel/frontend/assets/js/billing.js
 */

// Absolute path — works regardless of HTML file location.
// Update this if your app is not hosted under /bloodgroup/
const API_BASE = '/bloodgroup/api/billing';
// Fallback tenant ID — in a real multi-tenant setup, read from JWT/session
const TENANT_ID = 1;

let currentPage    = 1;
let totalPages     = 1;

// ───────────────────────────── Boot ──────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await Promise.allSettled([
        loadPlanAndUsage(),
        loadPlans(),
        loadInvoices(1),
    ]);

    document.getElementById('prev-page').addEventListener('click', () => { if (currentPage > 1) loadInvoices(currentPage - 1); });
    document.getElementById('next-page').addEventListener('click', () => { if (currentPage < totalPages) loadInvoices(currentPage + 1); });
    document.getElementById('manage-billing-btn').addEventListener('click', () => window.open('https://billing.stripe.com', '_blank'));
    document.getElementById('cancel-sub-btn').addEventListener('click', confirmCancelSubscription);
});

// ───────────────────────── Current Plan ──────────────────────────
async function loadPlanAndUsage() {
    try {
        const res  = await fetch(`${API_BASE}/current-plan.php?tenant_id=${TENANT_ID}`);
        const data = await res.json();

        // Banner
        const banner = document.getElementById('status-banner');
        banner.classList.remove('hidden');

        document.getElementById('current-plan-name').textContent = data.plan;
        document.getElementById('plan-meta').textContent =
            data.price
                ? `$${parseFloat(data.price).toFixed(2)} / ${data.billing_cycle ?? 'month'}`
                : 'Free Tier — Upgrade for more capacity';

        const statusBadge = document.getElementById('billing-status-badge');
        const s = data.billing_status ?? 'inactive';
        statusBadge.textContent = s.replace('_', ' ');
        statusBadge.className   = `status-badge status-${s}`;

        if (s === 'active') {
            document.getElementById('cancel-sub-btn').classList.remove('hidden');
        }

        // Usage bars
        renderUsageBar('calc', data.usage.calculations);
        renderUsageBar('ai',   data.usage.ai_requests);
    } catch (err) {
        console.error('Plan load error:', err);
    }
}

function renderUsageBar(prefix, { used, limit }) {
    const pct   = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const bar   = document.getElementById(`${prefix}-bar`);
    const count = document.getElementById(`${prefix}-count`);
    const hint  = document.getElementById(`${prefix}-hint`);

    count.textContent = `${used} / ${limit}`;
    hint.textContent  = `${pct}% used this month`;

    // Colour: green → amber → rose
    bar.style.width = `${pct}%`;
    bar.className   = `usage-bar ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : prefix === 'ai' ? 'bg-violet-500' : 'bg-blue-500'}`;
}

// ─────────────────────────── Plan Cards ──────────────────────────
async function loadPlans() {
    try {
        const res   = await fetch(`${API_BASE}/plans.php`);
        const data  = await res.json();
        const plans = data.plans ?? [];
        const grid  = document.getElementById('plans-grid');

        if (!plans.length) {
            grid.innerHTML = '<p class="text-slate-400 col-span-3 text-center py-8">No plans configured yet.</p>';
            return;
        }

        const colors = ['bg-slate-100 text-slate-600', 'bg-blue-500 text-white', 'bg-slate-900 text-white'];
        const btnColors = ['bg-blue-500 text-white hover:bg-blue-600', 'bg-white text-blue-600 hover:bg-blue-50', 'bg-blue-500 text-white hover:bg-blue-600'];
        const recommended = plans.length > 1 ? plans[Math.floor(plans.length / 2)]?.id : null;

        grid.innerHTML = plans.map((plan, i) => {
            const isRec = plan.id === recommended;
            const cIdx  = Math.min(i, 2);
            return `
            <div class="plan-card bg-white rounded-3xl p-8 shadow-sm border ${isRec ? 'border-blue-400 border-2' : 'border-slate-100'} relative overflow-hidden">
                ${isRec ? '<div class="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Recommended</div>' : ''}
                <h3 class="font-bold text-slate-800 text-lg mb-1">${plan.name}</h3>
                <div class="flex items-end gap-1 mb-4">
                    <span class="text-4xl font-black text-slate-900">$${parseFloat(plan.price).toFixed(2)}</span>
                    <span class="text-slate-400 mb-1">/${plan.billing_cycle}</span>
                </div>
                <ul class="space-y-2 mb-8 text-sm text-slate-600">
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        <strong>${plan.max_calculations.toLocaleString()}</strong>&nbsp;calculations/mo
                    </li>
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        <strong>${plan.max_ai_requests.toLocaleString()}</strong>&nbsp;AI requests/mo
                    </li>
                    <li class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                        Priority support
                    </li>
                </ul>
                <button
                    onclick="subscribeToPlan(${plan.id})"
                    id="subscribe-btn-${plan.id}"
                    class="w-full py-3 rounded-2xl font-bold transition-all ${isRec ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    Choose ${plan.name.split(' ')[0]}
                </button>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Plans load error:', err);
    }
}

window.subscribeToPlan = async function(planId) {
    const btn = document.getElementById(`subscribe-btn-${planId}`);
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Redirecting…';

    try {
        const res  = await fetch(`${API_BASE}/create-checkout.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: TENANT_ID, plan_id: planId }),
        });
        const data = await res.json();

        if (data.checkout_url) {
            window.location.href = data.checkout_url;
        } else {
            alert(data.error ?? 'Could not create checkout session. Check Stripe configuration.');
            btn.disabled    = false;
            btn.textContent = 'Try again';
        }
    } catch (err) {
        alert('Network error: ' + err.message);
        btn.disabled    = false;
        btn.textContent = 'Try again';
    }
};

// ─────────────────────────── Invoices ────────────────────────────
async function loadInvoices(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('invoices-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center"><div class="spinner mx-auto"></div></td></tr>';

    try {
        const res  = await fetch(`${API_BASE}/invoices.php?tenant_id=${TENANT_ID}&page=${page}`);
        const data = await res.json();
        totalPages = data.total_pages || 1;

        document.getElementById('invoice-total-badge').textContent =
            data.total > 0 ? `${data.total} invoice${data.total !== 1 ? 's' : ''}` : '';

        if (!data.invoices || data.invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 italic">No invoices yet. Subscribe to a plan to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = data.invoices.map(inv => {
            const statusColors = {
                paid:   { bg:'#d1fae5', color:'#047857' },
                failed: { bg:'#ffe4e6', color:'#e11d48' },
                open:   { bg:'#fef3c7', color:'#b45309' },
            };
            const sc  = statusColors[inv.status] ?? { bg:'#f1f5f9', color:'#64748b' };
            const date = new Date(inv.created_at).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
            const shortId = inv.stripe_invoice_id ? inv.stripe_invoice_id.replace('in_','#') : `#${inv.id}`;

            return `<tr class="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                <td class="px-8 py-4 text-sm text-slate-500">${date}</td>
                <td class="px-8 py-4 text-sm font-mono text-slate-700">${shortId}</td>
                <td class="px-8 py-4 text-sm font-bold text-slate-800">$${parseFloat(inv.amount).toFixed(2)}</td>
                <td class="px-8 py-4">
                    <span class="status-badge" style="background:${sc.bg};color:${sc.color};">${inv.status}</span>
                </td>
                <td class="px-8 py-4">
                    ${inv.invoice_url
                        ? `<a href="${inv.invoice_url}" target="_blank" class="flex items-center gap-1.5 text-blue-600 font-semibold text-sm hover:underline">
                             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                             Download
                           </a>`
                        : '<span class="text-slate-300 text-sm">—</span>'
                    }
                </td>
            </tr>`;
        }).join('');

        // Pagination
        const pager = document.getElementById('invoice-pagination');
        if (totalPages > 1) {
            pager.classList.remove('hidden');
            document.getElementById('page-info').textContent = `Page ${page} of ${totalPages}`;
            document.getElementById('prev-page').disabled = page <= 1;
            document.getElementById('next-page').disabled = page >= totalPages;
        } else {
            pager.classList.add('hidden');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-8 text-center text-rose-500">Failed to load invoices: ${err.message}</td></tr>`;
    }
}

// ────────────────── Cancel Subscription ──────────────────────────
async function confirmCancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of the billing period.')) return;

    try {
        const res  = await fetch(`${API_BASE}/cancel-subscription.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: TENANT_ID }),
        });
        const data = await res.json();
        if (data.success) {
            alert('Subscription cancelled. Access continues until the end of the billing period.');
            await loadPlanAndUsage();
        } else {
            alert(data.error ?? 'Failed to cancel subscription.');
        }
    } catch (err) {
        alert('Network error: ' + err.message);
    }
}
