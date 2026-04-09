/**
 * Billing dashboard logic.
 */

function normalizeBillingBase(value) {
    return value ? value.replace(/\/$/, '') : '';
}

function getDefaultBillingBase() {
    return normalizeBillingBase(new URL('../../../api/billing/', window.location.href).toString());
}

const BILLING_API_BASE = normalizeBillingBase((window.BLOODGROUP_CONFIG && window.BLOODGROUP_CONFIG.billingApiBase) || getDefaultBillingBase());
const TENANT_ID = 1;

let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.allSettled([
        loadPlanAndUsage(),
        loadPlans(),
        loadInvoices(1)
    ]);

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const manageBtn = document.getElementById('manage-billing-btn');
    const cancelBtn = document.getElementById('cancel-sub-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) loadInvoices(currentPage - 1); });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) loadInvoices(currentPage + 1); });
    if (manageBtn) manageBtn.addEventListener('click', () => window.open('https://billing.stripe.com', '_blank', 'noopener'));
    if (cancelBtn) cancelBtn.addEventListener('click', confirmCancelSubscription);
});

async function loadPlanAndUsage() {
    try {
        const res = await fetch(`${BILLING_API_BASE}/current-plan.php?tenant_id=${TENANT_ID}`, { credentials: 'include' });
        const data = await res.json();

        const banner = document.getElementById('status-banner');
        if (banner) {
            banner.className = 'rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700';
            banner.classList.remove('hidden');
            banner.textContent = 'Billing data loaded successfully.';
        }

        document.getElementById('current-plan-name').textContent = data.plan || 'Free Tier';
        document.getElementById('plan-meta').textContent = data.price
            ? `$${parseFloat(data.price).toFixed(2)} / ${data.billing_cycle || 'month'}`
            : 'Free Tier - Upgrade for more capacity';

        const statusBadge = document.getElementById('billing-status-badge');
        const status = data.billing_status || 'inactive';
        statusBadge.textContent = status.replace('_', ' ');
        statusBadge.className = `status-badge status-${status}`;

        const cancelBtn = document.getElementById('cancel-sub-btn');
        if (cancelBtn) {
            cancelBtn.classList.toggle('hidden', status !== 'active');
        }

        if (data.usage) {
            renderUsageBar('calc', data.usage.calculations);
            renderUsageBar('ai', data.usage.ai_requests);
        }
    } catch (err) {
        renderBannerError(`Could not load billing status: ${err.message}`);
    }
}

function renderUsageBar(prefix, usage) {
    if (!usage) return;

    const used = usage.used || 0;
    const limit = usage.limit || 0;
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const bar = document.getElementById(`${prefix}-bar`);
    const count = document.getElementById(`${prefix}-count`);
    const hint = document.getElementById(`${prefix}-hint`);

    if (count) count.textContent = `${used} / ${limit}`;
    if (hint) hint.textContent = `${pct}% used this month`;
    if (bar) {
        bar.style.width = `${pct}%`;
        bar.className = `usage-bar ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : prefix === 'ai' ? 'bg-violet-500' : 'bg-blue-500'}`;
    }
}

async function loadPlans() {
    const grid = document.getElementById('plans-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${BILLING_API_BASE}/plans.php`, { credentials: 'include' });
        const data = await res.json();
        const plans = data.plans || [];

        if (!plans.length) {
            grid.innerHTML = '<p class="text-slate-400 col-span-1 lg:col-span-3 text-center py-8">No plans configured yet.</p>';
            return;
        }

        const recommended = plans.length > 1 ? plans[Math.floor(plans.length / 2)].id : null;
        grid.innerHTML = plans.map(plan => {
            const isRecommended = plan.id === recommended;
            return `
                <article class="plan-card bg-white rounded-3xl p-8 shadow-sm border ${isRecommended ? 'border-blue-400 border-2' : 'border-slate-100'} relative overflow-hidden">
                    ${isRecommended ? '<div class="absolute top-4 right-4 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Recommended</div>' : ''}
                    <h3 class="font-bold text-slate-800 text-lg mb-1">${plan.name}</h3>
                    <div class="flex items-end gap-1 mb-4">
                        <span class="text-4xl font-black text-slate-900">$${parseFloat(plan.price).toFixed(2)}</span>
                        <span class="text-slate-400 mb-1">/${plan.billing_cycle}</span>
                    </div>
                    <ul class="space-y-2 mb-8 text-sm text-slate-600">
                        <li><strong>${Number(plan.max_calculations).toLocaleString()}</strong> calculations / month</li>
                        <li><strong>${Number(plan.max_ai_requests).toLocaleString()}</strong> AI requests / month</li>
                        <li>Priority support</li>
                    </ul>
                    <button
                        type="button"
                        onclick="subscribeToPlan(${plan.id})"
                        id="subscribe-btn-${plan.id}"
                        class="w-full py-3 rounded-2xl font-bold transition-all ${isRecommended ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                        Choose ${plan.name.split(' ')[0]}
                    </button>
                </article>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<p class="text-rose-500 col-span-1 lg:col-span-3 text-center py-8">Failed to load plans: ${err.message}</p>`;
    }
}

window.subscribeToPlan = async function(planId) {
    const btn = document.getElementById(`subscribe-btn-${planId}`);
    if (!btn) return;

    btn.disabled = true;
    btn.textContent = 'Redirecting...';

    try {
        const res = await fetch(`${BILLING_API_BASE}/create-checkout.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: TENANT_ID, plan_id: planId })
        });
        const data = await res.json();

        if (data.checkout_url) {
            window.location.href = data.checkout_url;
            return;
        }

        alert(data.error || 'Could not create checkout session. Check Stripe configuration.');
    } catch (err) {
        alert(`Network error: ${err.message}`);
    }

    btn.disabled = false;
    btn.textContent = 'Try again';
};

async function loadInvoices(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('invoices-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-8 text-center text-slate-400">Loading invoices...</td></tr>';

    try {
        const res = await fetch(`${BILLING_API_BASE}/invoices.php?tenant_id=${TENANT_ID}&page=${page}`, { credentials: 'include' });
        const data = await res.json();
        totalPages = data.total_pages || 1;

        const totalBadge = document.getElementById('invoice-total-badge');
        if (totalBadge) {
            totalBadge.textContent = data.total > 0 ? `${data.total} invoice${data.total !== 1 ? 's' : ''}` : 'No invoices yet';
        }

        if (!data.invoices || data.invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="px-8 py-12 text-center text-slate-400 italic">No invoices yet. Subscribe to a plan to get started.</td></tr>';
            updatePagination(page, totalPages);
            return;
        }

        tbody.innerHTML = data.invoices.map(inv => {
            const statusColors = {
                paid: { bg: '#dbeafe', color: '#1d4ed8' },
                failed: { bg: '#ffe4e6', color: '#e11d48' },
                open: { bg: '#fef3c7', color: '#b45309' }
            };
            const statusColor = statusColors[inv.status] || { bg: '#f1f5f9', color: '#64748b' };
            const date = new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const shortId = inv.stripe_invoice_id ? inv.stripe_invoice_id.replace('in_', '#') : `#${inv.id}`;

            return `
                <tr class="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                    <td class="px-6 py-4 text-sm text-slate-500">${date}</td>
                    <td class="px-6 py-4 text-sm font-mono text-slate-700">${shortId}</td>
                    <td class="px-6 py-4 text-sm font-bold text-slate-800">$${parseFloat(inv.amount).toFixed(2)}</td>
                    <td class="px-6 py-4">
                        <span class="status-badge" style="background:${statusColor.bg};color:${statusColor.color};">${inv.status}</span>
                    </td>
                    <td class="px-6 py-4">
                        ${inv.invoice_url
                            ? `<a href="${inv.invoice_url}" target="_blank" rel="noopener" class="text-blue-600 font-semibold text-sm hover:underline">Download</a>`
                            : '<span class="text-slate-300 text-sm">-</span>'
                        }
                    </td>
                </tr>
            `;
        }).join('');

        updatePagination(page, totalPages);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-8 text-center text-rose-500">Failed to load invoices: ${err.message}</td></tr>`;
    }
}

function updatePagination(page, pages) {
    const pager = document.getElementById('invoice-pagination');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (!pager || !pageInfo || !prevBtn || !nextBtn) return;

    if (pages > 1) {
        pager.classList.remove('hidden');
        pageInfo.textContent = `Page ${page} of ${pages}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= pages;
    } else {
        pager.classList.add('hidden');
    }
}

async function confirmCancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of the current billing period.')) {
        return;
    }

    try {
        const res = await fetch(`${BILLING_API_BASE}/cancel-subscription.php`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenant_id: TENANT_ID })
        });
        const data = await res.json();

        if (data.success) {
            alert('Subscription cancelled. Access continues until the end of the billing period.');
            await loadPlanAndUsage();
            return;
        }

        alert(data.error || 'Failed to cancel subscription.');
    } catch (err) {
        alert(`Network error: ${err.message}`);
    }
}

function renderBannerError(message) {
    const banner = document.getElementById('status-banner');
    if (!banner) return;

    banner.className = 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700';
    banner.classList.remove('hidden');
    banner.textContent = message;
}
