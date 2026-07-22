import wixData from 'wix-data';
import { getUploadUrl, processOrderSecurely, logErrorToDB, createPaymentForOrder } from 'backend/orderHandler';
import wixPayFrontend from 'wix-pay-frontend';

$w.onReady(function () {

    $w("#html4").onMessage(async (event) => {
        console.log("Message received from iframe");

        const data = event.data;

        // --- 1. Handle REQUEST_UPLOAD_URL ---
        if (data?.type === "REQUEST_UPLOAD_URL") {
            try {
                const uploadUrlResponse = await getUploadUrl(data.mimeType || "application/octet-stream");
                $w("#html4").postMessage({ type: "UPLOAD_URL_RESPONSE", uploadUrl: uploadUrlResponse.uploadUrl });
            } catch (err) {
                console.error("❌ Failed to get upload URL:", err);
                await logErrorToDB("Commander.js: getUploadUrl", "Failed to generate upload URL on frontend", err.message || err);
                $w("#html4").postMessage({ type: "ERROR", message: "Impossible de générer le lien de téléchargement." });
            }
            return;
        }

        // --- 2. Handle ORDER_SUBMIT ---
        if (data?.type !== "ORDER_SUBMIT") return;

        const order = data.payload;
        console.log("Order received:", order);

        try {
            // File upload logic removed since HTML component uploads directly via fetch
            const uploadedFileUrl = order.uploadedFileUrl || "";

            // 2. Generate unique Order Number & Build CMS record
            const orderNumber = 'T24-' + Date.now().toString(36).toUpperCase();

            const record = {
                orderNumber: orderNumber,
                fullName: order.fullName,
                email: order.email,
                phone: order.phone,
                sourceLanguage: order.sourceLanguage,
                targetLanguage: order.targetLanguage,
                documentType: order.documentType,
                selectedItems: order.selectedItems,
                isCertified: order.isCertified,
                urgency: order.urgency,
                message: order.message,
                uploadedFile: uploadedFileUrl,
                status: "unpaid",
                createdAt: new Date(),
                totalPrice: order.totalPrice,
            };

            console.log(record);

            const processResult = await processOrderSecurely(order, record);
            if (processResult && !processResult.success) {
                throw new Error(processResult.error || "Failed to process order securely");
            }

            console.log("Generating payment session via backend JSW...");

            const paymentResult = await createPaymentForOrder(order, record);
            if (paymentResult && !paymentResult.success) {
                throw new Error(paymentResult.error || "Failed to create payment session");
            }

            // Launch Wix Pay directly
            const payResult = await wixPayFrontend.startPayment(paymentResult.payment.id, {
                showThankYouPage: false
            });

            if (payResult.status === "Successful") {
                $w("#html4").postMessage({ type: "PAYMENT_SUCCESS" });
            } else if (payResult.status === "Pending") {
                $w("#html4").postMessage({ type: "PAYMENT_PENDING" });
            } else {
                $w("#html4").postMessage({ type: "ERROR", message: "Le paiement n'a pas été complété." });
            }

        } catch (err) {
            console.error("❌ Error in order flow:", err);
            await logErrorToDB("Commander.js: ORDER_SUBMIT", "Error processing order on frontend", err.message || err);
            $w("#html4").postMessage({ type: "ERROR", message: "Erreur Velo: " + err.message });
        }
    });
});
