import wixData from 'wix-data';
import { getUploadUrl, processOrderSecurely, logErrorToDB } from 'backend/orderHandler';
import { contacts, triggeredEmails } from 'wix-crm-frontend';
import { cart } from "wix-stores";
import wixEcomFrontend from "wix-ecom-frontend";

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
                status: "new",
                createdAt: new Date(),
                totalPrice: order.totalPrice,
            };

            console.log(record);

            const processResult = await processOrderSecurely(order, record);
            if (processResult && !processResult.success) {
                throw new Error(processResult.error || "Failed to process order securely");
            }

            console.log("Generating payment session via backend JSW...");

            // ─── OPTIMIZED FOR BACKEND SPI ─────────────────────────────────────
            // Strip any currency symbols or extra characters to ensure a clean number string (e.g. "45.00")
            const cleanNumericPrice = String(record.totalPrice)
                .replace(/[^0-9.]/g, '') // Removes everything except numbers and decimals
                .trim();

            const customTextFields = [];
            customTextFields.push({
                title: "Selected Options", 
                value: cleanNumericPrice,
            });
            customTextFields.push({
                title: "Order ID",
                value: orderNumber, // Used by backend events to sync status
            });
            // ───────────────────────────────────────────────────────────────────

            const newCart = await cart.addProducts([{
                productId: "de6ac936-c77b-41be-b023-263e2c34042f",
                quantity: 1,
                options: { choices: {}, customTextFields }
            }]);

            wixEcomFrontend.navigateToCheckoutPage(newCart._id);

        } catch (err) {
            console.error("❌ Error in order flow:", err);
            await logErrorToDB("Commander.js: ORDER_SUBMIT", "Error processing order on frontend", err.message || err);
            $w("#html4").postMessage({ type: "ERROR", message: "Erreur Velo: " + err.message });
        }
    });
});
