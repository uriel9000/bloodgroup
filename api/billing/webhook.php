<?php
/**
 * Blood Group Predictor - Stripe Webhook Handler
 * POST /api/billing/webhook.php
 * 
 * IMPORTANT: This endpoint must be publicly accessible via HTTPS.
 * Set the webhook secret in Stripe Dashboard → Webhooks → Signing Secret
 * and put it in STRIPE_WEBHOOK_SECRET (config.php or env var).
 */

require_once __DIR__ . '/../../admin_v2/includes/db.php';
require_once __DIR__ . '/config.php';

// Read raw body BEFORE any other output
$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

// ---- Verify webhook signature ----
function verifyStripeSignature(string $payload, string $sigHeader, string $secret): ?object
{
    // Parse header
    $parts = [];
    foreach (explode(',', $sigHeader) as $part) {
        [$k, $v] = explode('=', $part, 2) + [null, null];
        $parts[$k][] = $v;
    }
    $timestamp = $parts['t'][0] ?? '';
    $signatures = $parts['v1'] ?? [];

    if (!$timestamp || !$signatures)
        return null;

    // Prevent replay attacks (5 min tolerance)
    if (abs(time() - (int) $timestamp) > 300)
        return null;

    $signed = $timestamp . '.' . $payload;
    $computed = hash_hmac('sha256', $signed, $secret);

    foreach ($signatures as $sig) {
        if (hash_equals($computed, $sig)) {
            return json_decode($payload);
        }
    }
    return null;
}

$event = verifyStripeSignature($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
if (!$event) {
    http_response_code(400);
    echo 'Invalid signature';
    exit;
}

// ---- Event dispatcher ----
$type = $event->type ?? '';

switch ($type) {

    case 'invoice.payment_succeeded':
        $invoice = $event->data->object;
        $customerId = $invoice->customer;
        $amount = ($invoice->amount_paid ?? 0) / 100;
        $invoiceId = $invoice->id;
        $invoiceUrl = $invoice->hosted_invoice_url ?? '';
        $status = 'paid';

        // Find tenant by customer ID
        $tenantStmt = $pdo->prepare("SELECT id FROM tenants WHERE stripe_customer_id = ? LIMIT 1");
        $tenantStmt->execute([$customerId]);
        $tenantId = $tenantStmt->fetchColumn();

        if ($tenantId) {
            // Update billing status
            $pdo->prepare("UPDATE tenants SET billing_status = 'active' WHERE id = ?")
                ->execute([$tenantId]);

            // Store invoice (upsert)
            $check = $pdo->prepare("SELECT id FROM invoices WHERE stripe_invoice_id = ?");
            $check->execute([$invoiceId]);
            if (!$check->fetch()) {
                $pdo->prepare("INSERT INTO invoices (tenant_id, stripe_invoice_id, amount, status, invoice_url, created_at)
                               VALUES (?, ?, ?, ?, ?, NOW())")
                    ->execute([$tenantId, $invoiceId, $amount, $status, $invoiceUrl]);
            }
        }
        break;

    case 'invoice.payment_failed':
        $invoice = $event->data->object;
        $customerId = $invoice->customer;
        $invoiceId = $invoice->id;
        $invoiceUrl = $invoice->hosted_invoice_url ?? '';
        $amount = ($invoice->amount_due ?? 0) / 100;

        $tenantStmt = $pdo->prepare("SELECT id FROM tenants WHERE stripe_customer_id = ? LIMIT 1");
        $tenantStmt->execute([$customerId]);
        $tenantId = $tenantStmt->fetchColumn();

        if ($tenantId) {
            $pdo->prepare("UPDATE tenants SET billing_status = 'past_due' WHERE id = ?")
                ->execute([$tenantId]);

            $check = $pdo->prepare("SELECT id FROM invoices WHERE stripe_invoice_id = ?");
            $check->execute([$invoiceId]);
            if (!$check->fetch()) {
                $pdo->prepare("INSERT INTO invoices (tenant_id, stripe_invoice_id, amount, status, invoice_url, created_at)
                               VALUES (?, ?, ?, 'failed', ?, NOW())")
                    ->execute([$tenantId, $invoiceId, $amount, $invoiceUrl]);
            } else {
                $pdo->prepare("UPDATE invoices SET status = 'failed' WHERE stripe_invoice_id = ?")
                    ->execute([$invoiceId]);
            }
        }
        break;

    case 'customer.subscription.updated':
        $sub = $event->data->object;
        $customerId = $sub->customer;
        $subId = $sub->id;
        $status = $sub->status; // 'active', 'past_due', 'canceled', etc.

        // Try to match plan by price ID
        $priceId = $sub->items->data[0]->price->id ?? '';
        $planStmt = $pdo->prepare("SELECT name FROM plans WHERE stripe_price_id = ? LIMIT 1");
        $planStmt->execute([$priceId]);
        $planName = $planStmt->fetchColumn() ?: null;

        $tenantStmt = $pdo->prepare("SELECT id FROM tenants WHERE stripe_customer_id = ? LIMIT 1");
        $tenantStmt->execute([$customerId]);
        $tenantId = $tenantStmt->fetchColumn();

        if ($tenantId) {
            $fields = "stripe_subscription_id = ?, billing_status = ?";
            $params = [$subId, $status];
            if ($planName) {
                $fields .= ", plan = ?";
                $params[] = $planName;
            }
            $params[] = $tenantId;
            $pdo->prepare("UPDATE tenants SET $fields WHERE id = ?")->execute($params);
        }
        break;

    case 'customer.subscription.deleted':
        $sub = $event->data->object;
        $customerId = $sub->customer;

        $tenantStmt = $pdo->prepare("SELECT id FROM tenants WHERE stripe_customer_id = ? LIMIT 1");
        $tenantStmt->execute([$customerId]);
        $tenantId = $tenantStmt->fetchColumn();

        if ($tenantId) {
            $pdo->prepare("UPDATE tenants SET billing_status = 'canceled', plan = NULL, stripe_subscription_id = NULL WHERE id = ?")
                ->execute([$tenantId]);
        }
        break;

    case 'checkout.session.completed':
        $session = $event->data->object;
        $customerId = $session->customer;
        $subscriptionId = $session->subscription ?? null;
        $tenantId = $session->metadata->tenant_id ?? null;

        if ($tenantId && $subscriptionId) {
            $pdo->prepare(
                "UPDATE tenants SET stripe_subscription_id = ?, billing_status = 'active' WHERE id = ?"
            )->execute([$subscriptionId, (int) $tenantId]);
        }
        break;

    default:
        // Unhandled event — acknowledge and move on
        break;
}

http_response_code(200);
echo 'OK';
