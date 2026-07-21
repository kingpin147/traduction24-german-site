import wixData from 'wix-data';
import { getUploadUrl } from 'backend/orderHandler';
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
                const uploadUrl = await getUploadUrl(data.mimeType || "application/octet-stream");
                $w("#html4").postMessage({ type: "UPLOAD_URL_RESPONSE", uploadUrl });
            } catch (err) {
                console.error("❌ Failed to get upload URL:", err);
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

            await saveDataToDatabase(record);
            sendAutomationToAdminAndUser(order, record);

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
            $w("#html4").postMessage({ type: "ERROR", message: "Erreur Velo: " + err.message });
        }
    });
});

// ─── SAVE TO CMS ─────────────────────────────────────────────────────────────
const saveDataToDatabase = async (orderDetails) => {
    await wixData.insert("AllOrders", orderDetails);
    console.log("✅ Saved to CMS successfully");
};

// ─── SEND EMAILS TO USER AND ADMIN ───────────────────────────────────────────
const sendAutomationToAdminAndUser = (order, record) => {

    // Build contact object for CRM lookup
    const contactObject = {
        name: {
            first: order.fullName || ""
        },
        emails: [{
            email: order.email,
            primary: true
        }],
        phones: [{
            phone: order.phone || "",
            primary: true
        }]
    };

    // Create or find existing contact, then email the user
    contacts.appendOrCreateContact(contactObject)
        .then((resolvedContact) => {
            const customerContactId = resolvedContact.contactId;
            console.log("Contact resolved. ID:", customerContactId);

            return triggeredEmails.emailContact('VJmMXln', customerContactId, {
                variables: {
                    SITE_URL: "www.traduction24.ma"
                }
            });
        })
        .then(() => {
            console.log("✅ User thank you email sent.");
        })
        .catch((err) => {
            console.error("❌ User email flow error:", err);
        });

    // Email the admin separately
    const adminMemberId = "f54d0cbb-3242-4182-a387-5bca0ec465e4";

    triggeredEmails.emailMember('VJzPa53', adminMemberId, {
            variables: {
                fullName: order.fullName,
                email: order.email,
                phone: order.phone,
                sourceLanguage: order.sourceLanguage,
                targetLanguage: order.targetLanguage,
                documentType: order.documentType,
                isCertified: order.isCertified === true ? "Yes" : "No",
                urgency: order.urgency,
                message: order.message,
                status: "new",
                totalPrice: String(record.totalPrice) + " €",
                submissionTime: new Date().toLocaleString("fr-FR")
            }
        })
        .then(() => {
            console.log("✅ Admin email sent.");
        })
        .catch((err) => {
            console.error("❌ Admin email error:", err);
        });
};