// =============================================================================
// FILE: Thank You Page Code
// Paste this into the CODE tab of your /thank-you page.
// Wix Editor → navigate to your Thank You page → Page Code tab
//
// REQUIRED: Add these elements to your Thank You page in the Wix Editor
// and give them the exact IDs listed below:
//
//  Text elements:
//    #txtOrderId         — "Order #T24-XXXXXX"
//    #txtClientName      — client's full name
//    #txtEmail           — client's email
//    #txtTelephone       — client's phone
//    #txtDeliveryAddress — delivery address
//    #txtSourceLang      — source language
//    #txtTargetLang      — target language
//    #txtProcessingTime  — processing time label
//    #txtDestination     — destination label
//    #txtTotal           — grand total e.g. "$40"
//    #txtPaidAt          — payment date/time
//    #txtUploadedFile    — uploaded filename (or "None")
//    #txtDocumentsList   — comma-separated document names
//    #txtStatus          — "Paid" / "Pending"
//
//  Containers (optional — hide/show based on status):
//    #boxSuccess         — shown when status is 'paid'
//    #boxPending         — shown when status is 'pending'
// =============================================================================

import { session } from 'wix-storage';
import wixLocation from 'wix-location';

// ── Helpers ───────────────────────────────────────────────────────────────────

const processingLabels = {
  standard: 'Standard (10 days)',
  urgent:   'Urgent (3 days)',
  urgent24: 'Urgent 24h',
};

const destinationLabels = {
  morocco: 'Morocco',
  europe:  'EU Europe',
};

// ── Page ready ────────────────────────────────────────────────────────────────
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

  const { orderId, contact, documents, uploadedFile, sourceLang, targetLang,
          processingTime, destination, pricing, paidAt, status } = order;

  // ── Populate text elements ─────────────────────────────────────────────────

  // Safe setter — only sets if element exists on the page
  const setText = (id, value) => {
    try { $w(id).text = String(value || ''); } catch (_) {}
  };
  const show = (id) => { try { $w(id).show(); } catch (_) {} };
  const hide = (id) => { try { $w(id).hide(); } catch (_) {} };

  setText('#txtOrderId',         `Order #${orderId}`);
  setText('#txtClientName',      contact.name);
  setText('#txtEmail',           contact.email);
  setText('#txtTelephone',       contact.telephone);
  setText('#txtDeliveryAddress', contact.deliveryAddress);
  setText('#txtSourceLang',      sourceLang);
  setText('#txtTargetLang',      targetLang);
  setText('#txtProcessingTime',  processingLabels[processingTime] || processingTime);
  setText('#txtDestination',     destinationLabels[destination]   || destination);
  setText('#txtTotal',           `$${pricing.total}`);
  setText('#txtUploadedFile',    uploadedFile ? uploadedFile.name : 'No file uploaded');
  setText('#txtStatus',          status === 'paid' ? '✅ Paid' : '⏳ Pending');

  // Documents list
  if (documents && documents.length > 0) {
    const docList = documents.map(d => `${d.name} ($${d.eur})`).join(', ');
    setText('#txtDocumentsList', docList);
  }

  // Payment date
  if (paidAt) {
    const d = new Date(paidAt);
    setText('#txtPaidAt', d.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }));
  }

  // Show/hide status boxes
  if (status === 'paid') {
    show('#boxSuccess');
    hide('#boxPending');
  } else {
    hide('#boxSuccess');
    show('#boxPending');
  }

  // ── Optionally clear session after reading (uncomment if desired) ──────────
  // session.removeItem('translation24_order');
});