import wixLocation from "wix-location";

$w.onReady(function () {
    const slug = wixLocation.path;
    const languageBoxes = ["box19", "box20", "box21"];

    console.log(slug);

    languageBoxes.forEach((languageBox) => {
        $w(`#${languageBox}`).onClick(() => {
            wixLocation.to("/commander");
        });
    });
});