
browser.contextMenus.create({
	id: "char-identifier-identify",
	title: "Identify Characters",
	contexts: ["selection"]
});

// Using this rather than onclick above allows use of event pages; see
// https://developer.chrome.com/extensions/event_pages .  But I'm not
// using event pages yet; Firefox doesn't support them.
browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId == "char-identifier-identify") {
		gWorker.postMessage({operation: "add_pending", string: info.selectionText});

		// FIXME: Persist the size and position of this window!
		browser.windows.create({
			url: [ "characterDialog.html" ],
			width: 800,
			height: 400,
			type: "popup"
		});
	}
});

var gWorker = new Worker("worker.js");
gWorker.addEventListener("message", handle_message);
var gWindowIds = {};
var gNextWindowId = 0;

function handle_message(event) {
	let data = event.data;
	let win = gWindowIds[data.id];
	if (win) {
		win.UpdateChars(data.chars);
	}
}

