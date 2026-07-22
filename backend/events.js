import wixData from 'wix-data';
import { logErrorToDB } from 'backend/orderHandler';

// =============================================================================
// wixEcom_onOrderPaid
// Fires when an order is paid in Wix Stores/Checkout
// =============================================================================
export async function wixEcom_onOrderPaid(event) {
    console.log("💳 wixEcom_onOrderPaid event triggered:", event.order ? event.order.number : "Unknown");
    
    try {
        const orderNumber = extractCustomOrderId(event);
        if (orderNumber) {
            await updateOrderStatus(orderNumber, "paid");
            console.log(`✅ Updated AllOrders record ${orderNumber} to paid.`);
        } else {
            console.log("⚠️ No custom Order ID found in line items. Skipping update.");
        }
    } catch (err) {
        console.error("❌ Error in wixEcom_onOrderPaid:", err);
        await logErrorToDB("wixEcom_onOrderPaid", "Error processing paid order", err.message || err);
    }
}

// =============================================================================
// wixEcom_onOrderCanceled
// Fires when an order is canceled in Wix Stores/Checkout
// =============================================================================
export async function wixEcom_onOrderCanceled(event) {
    console.log("🚫 wixEcom_onOrderCanceled event triggered:", event.order ? event.order.number : "Unknown");
    
    try {
        const orderNumber = extractCustomOrderId(event);
        if (orderNumber) {
            await updateOrderStatus(orderNumber, "canceled");
            console.log(`✅ Updated AllOrders record ${orderNumber} to canceled.`);
        }
    } catch (err) {
        console.error("❌ Error in wixEcom_onOrderCanceled:", err);
        await logErrorToDB("wixEcom_onOrderCanceled", "Error processing canceled order", err.message || err);
    }
}

// =============================================================================
// wixPay_onPaymentUpdate
// Fires when a Wix Pay payment status changes
// =============================================================================
export async function wixPay_onPaymentUpdate(event) {
    console.log(`💳 wixPay_onPaymentUpdate event triggered for payment: ${event.payment.id}, status: ${event.status}`);

    try {
        if (event.status === "Successful") {
            const results = await wixData.query("AllOrders")
                .eq("paymentId", event.payment.id)
                .limit(1)
                .find({ suppressAuth: true });

            if (results.items.length > 0) {
                const item = results.items[0];
                item.status = "paid";
                await wixData.update("AllOrders", item, { suppressAuth: true });
                console.log(`✅ Updated AllOrders record (Payment ID: ${event.payment.id}) to paid.`);
            } else {
                console.log(`⚠️ No order found in AllOrders matching Payment ID: ${event.payment.id}`);
            }
        }
    } catch (err) {
        console.error("❌ Error in wixPay_onPaymentUpdate:", err);
        await logErrorToDB("wixPay_onPaymentUpdate", "Error processing payment update", err.message || err);
    }
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

function extractCustomOrderId(event) {
    // The event payload structure can vary slightly depending on API version.
    // Try to get line items from event.entity, event.order, or event directly.
    const orderData = event.entity || event.order || event;
    const lineItems = orderData.lineItems || [];
    
    for (const item of lineItems) {
        // Look into customTextFields
        const customFields = item.customTextFields || (item.options && item.options.customTextFields) || [];
        const orderIdField = customFields.find(f => f.title === "Order ID");
        
        if (orderIdField && orderIdField.value) {
            return orderIdField.value;
        }
    }
    return null;
}

async function updateOrderStatus(orderNumber, newStatus) {
    // 1. Query the AllOrders collection for this orderNumber
    const results = await wixData.query("AllOrders")
        .eq("orderNumber", orderNumber)
        .limit(1)
        .find({ suppressAuth: true });
        
    if (results.items.length > 0) {
        const item = results.items[0];
        item.status = newStatus; // "paid" or "canceled"
        
        // 2. Update the record
        await wixData.update("AllOrders", item, { suppressAuth: true });
    } else {
        throw new Error(`Order ${orderNumber} not found in AllOrders database.`);
    }
}
