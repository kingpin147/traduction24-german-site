import wixWindow from 'wix-window';
import wixData from 'wix-data';

$w.onReady(async function () {
    let currentLang = wixWindow.multilingual.currentLanguage;

    $w("#customfaqsystem1").setAttribute("language", currentLang);

    // Replace 'YOUR_ITEM_ID_HERE' with the actual ID from your collection
    const itemId = "SINGLE_ITEM_ID";

    let toUpdate = {
        "_id": itemId,
        "currentLan": currentLang // Ensure 'languageField' matches your collection's Field Key
    };

    try {
        await wixData.save("languageData", toUpdate);
        console.log("Language updated to:", currentLang);
    } catch (err) {
        console.error("Update failed:", err);
    }
});