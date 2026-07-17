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
import { createOrder } from 'backend/custom-checkout.jsw';
import wixEcomFrontend from 'wix-ecom-frontend';

// The ID of your HTML Component in the Wix Editor
const HTML_COMPONENT_ID = "#html1";

$w.onReady(function () {

    // 1. Reference the HTML component
    const widget = $w(HTML_COMPONENT_ID);

    // 2. Listen for the 'postMessage' sent from your HTML script
    widget.onMessage(async (event) => {
        const { type, orderData } = event.data || {};
        if (type !== 'TRANSLATION24_CHECKOUT') return;


        console.log(orderData);

        try {
            // 1. Send the WHOLE orderData to the backend
            const checkoutResponse = await createOrder(orderData);

            const checkoutId = checkoutResponse?.checkout?._id || checkoutResponse?._id;

            if (checkoutId) {
                // 2. Redirect to the Wix Checkout page with the dynamic price
                await wixEcomFrontend.navigateToCheckoutPage(checkoutId);
            }

        } catch (err) {
            console.error('❌ Checkout Error:', err.message);
        }
    });
});

/**
 * Helper function to handle the order logic
 * @param {Object} data - The orderData object from the HTML component
 */
async function handleOrderSubmission(data) {
    console.log(`📝 Processing order for: ${data.customer.name}`);
    console.log(`💰 Total to charge: ${data.total}`);

    // This is where you would call wixData.insert("Orders", data) 
    // to save the info permanently.
    return true;
}

// ── 1. Save to CMS + create wix-pay payment (backend call) ──────────────
// const { paymentId, orderId, cmsItemId } = await saveOrderAndCreatePayment(orderData);

// console.log(`💳 Payment created — ID: ${paymentId} | Order: ${orderId}`);

// // ── 2. Launch the wix-pay payment modal ───────────────────────────────
// // showThankYouPage: false — we handle the redirect ourselves
// const result = await wixPay.startPayment(paymentId, {
//     showThankYouPage: false,
// });

// console.log('💳 Payment result:', result.status);

// // ── 3. Handle outcome ─────────────────────────────────────────────────

// if (result.status === 'Successful') {

//     // Update CMS record to 'paid'
//     await updateOrderStatus(cmsItemId, 'paid');

//     // Save full order to session so Thank You page can display it
//     session.setItem('translation24_order', JSON.stringify({
//         orderId,
//         contact: orderData.contact,
//         documents: orderData.documents,
//         uploadedFile: orderData.uploadedFile,
//         sourceLang: orderData.sourceLang,
//         targetLang: orderData.targetLang,
//         processingTime: orderData.processingTime,
//         destination: orderData.destination,
//         pricing: orderData.pricing,
//         status: 'paid',
//         paidAt: new Date().toISOString(),
//     }));

//     // Redirect to Thank You page
//     wixLocation.to(THANK_YOU_PAGE);

// } else if (result.status === 'Pending') {

//     // Bank transfer / delayed payment
//     await updateOrderStatus(cmsItemId, 'pending');

//     session.setItem('translation24_order', JSON.stringify({
//         orderId,
//         contact: orderData.contact,
//         documents: orderData.documents,
//         pricing: orderData.pricing,
//         status: 'pending',
//         paidAt: new Date().toISOString(),
//     }));

//     wixLocation.to(THANK_YOU_PAGE);

// } else if (result.status === 'Failed') {

//     // Payment failed — update CMS, stay on page (wix-pay shows its own error)
//     await updateOrderStatus(cmsItemId, 'failed');
//     console.error('❌ Payment failed for order:', orderId);
//     // No redirect — user stays on page and can try again

// } else {
//     // Cancelled by user — update CMS status
//     await updateOrderStatus(cmsItemId, 'cancelled');
//     console.log('🚫 Payment cancelled by user. Order:', orderId);
//     // No redirect — user stays on page
// }