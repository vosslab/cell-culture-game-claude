// ============================================
// ui/notifications.ts - Toast notification system
// ============================================
// Manages a stack of dismissible toast notifications.
// This IS the UI layer, so direct DOM access is expected.

// Maximum visible notifications before oldest gets pushed out
const MAX_VISIBLE_NOTIFICATIONS = 3;

// Auto-fade delay in milliseconds
const FADE_DELAY_MS = 3000;

// Duration of the CSS fade-out transition before element removal
const FADE_TRANSITION_MS = 300;

// ============================================
// showNotification() - Display a toast notification
// ============================================
export function showNotification(
	message: string,
	type: "info" | "success" | "warning" | "error" = "info",
): void {
	const notificationArea = document.getElementById("notification-area") as HTMLDivElement;
	if (!notificationArea) return;

	// Create the notification element with the appropriate type class
	const notification = document.createElement("div");
	notification.className = "notification " + type;
	notification.textContent = message;

	notificationArea.appendChild(notification);

	// Enforce the max-visible limit by fading out the oldest notification
	const existing = notificationArea.querySelectorAll(".notification:not(.fade-out)");
	if (existing.length > MAX_VISIBLE_NOTIFICATIONS) {
		const oldest = existing[0] as HTMLElement;
		oldest.classList.add("fade-out");
		setTimeout(() => {
			oldest.remove();
		}, FADE_TRANSITION_MS);
	}

	// Auto-fade this notification after the configured delay
	setTimeout(() => {
		notification.classList.add("fade-out");
		setTimeout(() => {
			notification.remove();
		}, FADE_TRANSITION_MS);
	}, FADE_DELAY_MS);
}
