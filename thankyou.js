// =============================================================================
// FILE: Thank You Page Code
// Paste this into the CODE tab of your /thank-you page.
// Wix Editor → navigate to your Thank You page → Page Code tab
//
// REQUIRED: Add an HTML component to your Thank You page in the Wix Editor,
// set its code to the contents of `ThankYou.html`, and give it the exact ID:
//    #htmlThankYou
// =============================================================================

import { session } from 'wix-storage';
import wixLocation from 'wix-location';

$w.onReady(function () {

  // Read order from session storage
  const raw = session.getItem('translation24_order');

  if (!raw) {
    // No order data — redirect back to order page
    console.warn('No order data found in session. Redirecting to /bestellen.');
    wixLocation.to('/bestellen');
    return;
  }

  let order;
  try {
    order = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse order from session:', e);
    wixLocation.to('/bestellen');
    return;
  }

  console.log('%c✅ Thank You page — order loaded', 'color:#00BD61;font-weight:bold;', order);

  // Send data to the custom HTML component
  // We use a small timeout to ensure the HTML iframe has fully loaded its internal script
  setTimeout(() => {
    try {
      $w('#htmlThankYou').postMessage({ type: 'ORDER_DATA', payload: order });
    } catch (err) {
      console.error('Failed to send order data to HTML component. Ensure the HTML element ID is #htmlThankYou', err);
    }
  }, 500);

  // Listen for resize messages from the iframe (informational)
  try {
    $w('#htmlThankYou').onMessage((event) => {
      if (event.data && event.data.type === 'RESIZE') {
        console.log('HTML Component requested height:', event.data.height);
        // $w('#htmlThankYou').height = event.data.height; // Uncomment if your Wix layout supports dynamic resizing
      }
    });
  } catch (e) {}

  // ── Optionally clear session after reading (uncomment if desired) ──────────
  // session.removeItem('translation24_order');
});