export function isPageDark() {
	const html = document.documentElement;
	if (
		html.hasAttribute("data-darkreader-scheme") ||
		html.hasAttribute("data-darkreader-mode")
	) {
		return true;
	}

	const body = document.body;
	if (body) {
		const bg = window.getComputedStyle(body).backgroundColor;
		const match = bg.match(/\d+/g);
		if (match && match.length >= 3) {
			const [r, g, b] = match.map(Number);
			const brightness = (r * 299 + g * 587 + b * 114) / 1000;
			return brightness < 128;
		}
	}

	return false;
}

export function syncPanelTheme(panel) {
	if (!panel) return;
	if (isPageDark()) {
		panel.classList.add("pup-dark");
		panel.style.colorScheme = "dark";
	} else {
		panel.classList.remove("pup-dark");
		panel.style.colorScheme = "light";
	}
}
