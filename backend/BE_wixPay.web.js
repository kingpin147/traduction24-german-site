import { Permissions, webMethod } from "wix-web-module";
import wixPayBackend from "wix-pay-backend";

// FIX 1: Use a named export instead of 'export default'
export const createPaymentForProduct = webMethod(
  Permissions.Anyone, 
  async (name, price) => {
    try {
      // FIX 2: Ensure the price is strictly a number type
      const numericPrice = Number(price);

      if (isNaN(numericPrice) || numericPrice <= 0) {
        throw new Error("Invalid payment amount provided.");
      }

      console.log(`Backend generating payment session for ${name} - Amount: ${numericPrice}`);

      const paymentSession = await wixPayBackend.createPayment({
        items: [
          {
            name: name || "Translation Service",
            price: numericPrice,
            quantity: 1 // Wix Pay often likes an explicit quantity
          },
        ],
        amount: numericPrice,
      });

      return paymentSession;

    } catch (error) {
      console.error("❌ Failed to create payment session in backend:", error);
      throw error;
    }
  }
);