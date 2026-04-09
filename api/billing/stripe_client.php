<?php
/**
 * Blood Group Predictor - Stripe HTTP Client (no-Composer)
 * Wraps Stripe REST API using cURL.
 */

class StripeClient
{
    private string $secretKey;
    private string $baseUrl = 'https://api.stripe.com/v1';

    public function __construct(string $secretKey)
    {
        $this->secretKey = $secretKey;
    }

    /** Make a request to the Stripe API */
    private function request(string $method, string $endpoint, array $data = []): array
    {
        $url = $this->baseUrl . $endpoint;
        $headers = [
            'Authorization: Bearer ' . $this->secretKey,
            'Content-Type: application/x-www-form-urlencoded',
            'Stripe-Version: 2024-04-10',
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        } elseif ($method === 'DELETE') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new RuntimeException('cURL error: ' . $error);
        }

        $decoded = json_decode($response, true);
        if ($httpCode >= 400) {
            $msg = $decoded['error']['message'] ?? 'Stripe API error';
            throw new RuntimeException("Stripe error ($httpCode): $msg");
        }

        return $decoded;
    }

    /** Create a Stripe Customer */
    public function createCustomer(string $email, string $name, string $tenantId): array
    {
        return $this->request('POST', '/customers', [
            'email' => $email,
            'name' => $name,
            'metadata[tenant_id]' => $tenantId,
        ]);
    }

    /** Create a Checkout Session for a subscription */
    public function createCheckoutSession(array $params): array
    {
        $flat = $this->flattenArray($params);
        return $this->request('POST', '/checkout/sessions', $flat);
    }

    /** Retrieve a Subscription */
    public function getSubscription(string $subscriptionId): array
    {
        return $this->request('GET', "/subscriptions/$subscriptionId");
    }

    /** Cancel a Subscription */
    public function cancelSubscription(string $subscriptionId): array
    {
        return $this->request('DELETE', "/subscriptions/$subscriptionId");
    }

    /** List Invoices for a Customer */
    public function listInvoices(string $customerId, int $limit = 20): array
    {
        $url = "/invoices?customer=$customerId&limit=$limit";
        return $this->request('GET', $url);
    }

    /** Flatten nested array to Stripe's dot-bracket notation */
    private function flattenArray(array $data, string $prefix = ''): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            $newKey = $prefix ? "{$prefix}[{$key}]" : $key;
            if (is_array($value)) {
                $result = array_merge($result, $this->flattenArray($value, $newKey));
            } else {
                $result[$newKey] = $value;
            }
        }
        return $result;
    }
}
