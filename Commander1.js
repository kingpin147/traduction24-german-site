// =============================================================================
// FILE: Wix Page Code
// Paste this into the CODE tab of the page where your widget is embedded.
// Wix Editor → click the page → Properties & Events → Page Code
//
// IMPORTANT: Replace 'documentPurchaseSystem1' below with your actual
// widget element ID (check Properties & Events panel in Wix Editor)
// =============================================================================

import wixPay from 'wix-pay';
import wixLocation from 'wix-location';
import { session } from 'wix-storage';
import { saveOrderAndCreatePayment, updateOrderStatus } from 'backend/checkout';

// ─── Your widget element ID (from Properties & Events panel) ─────────────────
const WIDGET_ID = '#documentPurchaseSystem1';

// ─── Thank You page slug ──────────────────────────────────────────────────────
const THANK_YOU_PAGE = '/thank-you';

// =============================================================================
$w.onReady(function () {

    // ── Listen for messages FROM the widget ────────────────────────────────────
    // Wix Blocks custom elements use .onMessage() instead of window.addEventListener

    /** @type {any} */
    const widget = $w(WIDGET_ID);
    widget.onMessage(async (event) => {

        const { type, orderData } = event.data || {};

        // Only handle our specific checkout event
        if (type !== 'TRANSLATION24_CHECKOUT') return;

        console.log('📦 Order received from widget:', orderData);

        try {

            // ── 1. Save to CMS + create wix-pay payment (backend call) ──────────────
            const { paymentId, orderId, cmsItemId } = await saveOrderAndCreatePayment(orderData);

            console.log(`💳 Payment created — ID: ${paymentId} | Order: ${orderId}`);

            // ── 2. Launch the wix-pay payment modal ───────────────────────────────
            // showThankYouPage: false — we handle the redirect ourselves
            const result = await wixPay.startPayment(paymentId, {
                showThankYouPage: false,
            });

            console.log('💳 Payment result:', result.status);

            // ── 3. Handle outcome ─────────────────────────────────────────────────

            if (result.status === 'Successful') {

                // Update CMS record to 'paid'
                await updateOrderStatus(cmsItemId, 'paid');

                // Save full order to session so Thank You page can display it
                session.setItem('translation24_order', JSON.stringify({
                    orderId,
                    contact: orderData.contact,
                    documents: orderData.documents,
                    uploadedFile: orderData.uploadedFile,
                    sourceLang: orderData.sourceLang,
                    targetLang: orderData.targetLang,
                    processingTime: orderData.processingTime,
                    destination: orderData.destination,
                    pricing: orderData.pricing,
                    status: 'paid',
                    paidAt: new Date().toISOString(),
                }));

                // Redirect to Thank You page
                wixLocation.to(THANK_YOU_PAGE);

            } else if (result.status === 'Pending') {

                // Bank transfer / delayed payment
                await updateOrderStatus(cmsItemId, 'pending');

                session.setItem('translation24_order', JSON.stringify({
                    orderId,
                    contact: orderData.contact,
                    documents: orderData.documents,
                    pricing: orderData.pricing,
                    status: 'pending',
                    paidAt: new Date().toISOString(),
                }));

                wixLocation.to(THANK_YOU_PAGE);

            } else if (result.status === 'Failed') {

                // Payment failed — update CMS, stay on page (wix-pay shows its own error)
                await updateOrderStatus(cmsItemId, 'failed');
                console.error('❌ Payment failed for order:', orderId);
                // No redirect — user stays on page and can try again

            } else {
                // Cancelled by user — update CMS status
                await updateOrderStatus(cmsItemId, 'cancelled');
                console.log('🚫 Payment cancelled by user. Order:', orderId);
                // No redirect — user stays on page
            }

        } catch (err) {
            // Something went wrong on the backend (CMS write or payment creation)
            // Log it — user stays on the page naturally since we don't redirect
            console.error('❌ Checkout error:', err.message);
        }

    });

});