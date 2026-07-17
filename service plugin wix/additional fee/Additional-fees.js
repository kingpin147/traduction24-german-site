import * as ecomAdditionalFees from 'interfaces-ecommerce-v1-additional-fees-provider';
import wixSiteBackend from "wix-site-backend";

export const calculateAdditionalFees = async (options) => {
    let additionalFees = [];
    const currency = await wixSiteBackend.generalInfo.getPaymentCurrency();

    let totalFeeAmount = 0;
    const lineItems = options.lineItems || [];

    lineItems.forEach((item) => {
        const itemQuantity = Number(item.quantity) || 1;

        // Extracting directly based on your log layout:
        // item -> catalogReference -> options -> customTextFields
        const customFields = item.catalogReference?.options?.customTextFields;

        if (customFields) {
            // Target the exact key from your logs: "Selected Options"
            const priceValue = customFields["Selected Options"];

            if (priceValue) {
                const cleanPriceString = String(priceValue).trim();
                let dynamicPrice = 0;

                // Check if it is a direct number string like "280"
                if (!isNaN(Number(cleanPriceString))) {
                    dynamicPrice = Number(cleanPriceString);
                } else {
                    // Backup regex just in case it ever contains text later (e.g., "Search-280")
                    const priceMatch = cleanPriceString.match(/-.*?(\d+)\s*$/);
                    if (priceMatch) {
                        dynamicPrice = Number(priceMatch[1]) || 0;
                    }
                }

                // Multiply extracted price by item quantity
                totalFeeAmount += (dynamicPrice);
            }
        }
    });

    // Format the final value to a clean decimal string required by Wix (e.g., "280.00")
    const finalPriceString = totalFeeAmount.toFixed(2);

    additionalFees.push({
        code: "Selected Options Fees",
        name: "Selected Options Fees",
        price: finalPriceString,
        taxDetails: {
            taxable: false,
        },
    });

    return {
        currency,
        additionalFees,
    };
};