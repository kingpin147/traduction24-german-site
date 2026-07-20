# Traduction24 Commander

This repository contains the codebase for the Commander section of the Traduction24 German site. It allows users to upload documents for translation, calculate prices, and submit orders.

## Project Structure

- **`Commander.html`**: The main frontend UI built with HTML/CSS/JavaScript. It collects user input (documents, deadline, shipping), calculates the price, and sends an `ORDER_SUBMIT` message via `postMessage`. This file is designed to be embedded in a Wix site using an iframe (HTML Component).
- **`Commander.js`**: The Wix Velo page code. It listens for messages from the iframe (`#html4`). Upon receiving an order, it:
  1. Uploads the provided base64 file to the Wix backend.
  2. Saves the order record to the `AllOrders` CMS collection.
  3. Triggers automated emails to the customer and the admin.
  4. Generates a Wix Stores cart session with the calculated price and redirects the user to checkout.
- **`backend/`**: Contains the Velo backend web modules.
  - `orderHandler.jsw`: Handles file uploads from base64 strings and sending admin email notifications.
  - `checkout.jsw` / `custom-checkout.jsw` / `BE_wixPay.web.js`: Additional backend files handling checkout and Wix Pay integrations.

## Known Issues

- **Large File Uploads (`413 Request Entity Too Large`)**: Currently, the system reads files as Base64 strings in the iframe and passes them to the backend. Because Wix Velo backend functions have strict payload size limits (~14MB), uploading large PDFs (like >10MB) causes a 413 error and breaks the order flow before it reaches the payment stage. **Fix required:** Implement direct-to-cloud storage uploads from the iframe or use native Wix upload mechanisms.

## Setup & Deployment

1. **Frontend**: Paste the contents of `Commander.html` into a Wix HTML Component (iframe).
2. **Page Code**: Paste the contents of `Commander.js` into the Velo page code section of the Commander page. Ensure the iframe ID matches (`#html4`).
3. **Backend**: Upload the files inside the `backend/` folder into the `backend/` section of the Wix site.
4. **CMS & Products**: Ensure you have an `AllOrders` CMS collection and a dummy product configured in Wix Stores (used to map dynamic prices via `cart.addProducts`).
