const use6ChannelsCheckbox = document.getElementById("use-51");
const setMaxBitrateCheckbox = document.getElementById("set-max-bitrate");
const disableVP9Checkbox = document.getElementById("disable-vp9");
const disableAVChighCheckbox = document.getElementById("disable-avchigh");
const disableAV1Checkbox = document.getElementById("disable-av1");
const showAllSubsCheckbox = document.getElementById("show-all-subs");

const optionsSavedLabel = document.getElementById("options-saved");

function saveOptions() {
	const use6Channels = use6ChannelsCheckbox.checked;
	const setMaxBitrate = setMaxBitrateCheckbox.checked;
	const disableVP9 = disableVP9Checkbox.checked;
	const disableAVChigh = disableAVChighCheckbox.checked;
	const showAllSubs = showAllSubsCheckbox.checked;
	const disableAV1 = disableAV1Checkbox.checked;

	chrome.storage.sync.set({
		use6Channels,
		setMaxBitrate,
		disableVP9,
		disableAVChigh,
		showAllSubs,
		disableAV1,
	}, function() {
		optionsSavedLabel.style.display = "inline-block";
	});
}

function restoreOptions() {
	chrome.storage.sync.get({
		use6Channels: true,
		setMaxBitrate: true,
		disableVP9: false,
		disableAVChigh: false,
		showAllSubs: false,
		disableAV1: false,
	}, function(items) {
		use6ChannelsCheckbox.checked = items.use6Channels;
		setMaxBitrateCheckbox.checked = items.setMaxBitrate;
		disableVP9Checkbox.checked = items.disableVP9;
		disableAVChighCheckbox.checked = items.disableAVChigh;
		showAllSubsCheckbox.checked = items.showAllSubs;
		disableAV1Checkbox.checked = items.disableAV1;
	});
}

document.getElementById("save").addEventListener("click", saveOptions);

document.querySelectorAll("input[type=checkbox]").forEach(checkbox => {
	checkbox.addEventListener("change", () => optionsSavedLabel.style.display = "none");
});

restoreOptions();