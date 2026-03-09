import { STORAGE_KEYS } from './const/defaults.js';
import { storage } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
	const UI = {
		logsBody: document.getElementById('logs-body'),
		noLogs: document.getElementById('no-logs'),
		clearBtn: document.getElementById('clear-logs'),
		backBtn: document.getElementById('back-to-popup')
	};

	// --- 1. Rendering Logic ---
	async function renderLogs() {
		const result = await storage.getLocal(STORAGE_KEYS.PRIVACY_LOGS);
		const logs = result[STORAGE_KEYS.PRIVACY_LOGS] || [];

		if (logs.length === 0) {
			if (UI.logsBody) UI.logsBody.innerHTML = '';
			if (UI.noLogs) UI.noLogs.style.display = 'block';
			return;
		}

		if (UI.noLogs) UI.noLogs.style.display = 'none';
		if (UI.logsBody) {
			UI.logsBody.innerHTML = logs.map(log => {
				const date = new Date(log.timestamp);
				const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
				const typeClass = `type-${log.type.toLowerCase()}`;
				const hostname = log.url ? new URL(log.url).hostname : 'N/A';

				return `
          <tr>
            <td>${timeString}</td>
            <td><span class="log-type ${typeClass}">${log.type}</span></td>
            <td>${log.description}</td>
            <td><a href="${log.url}" target="_blank" class="log-url">${hostname}</a></td>
          </tr>
        `;
			}).join('');
		}
	}

	// Initial Render
	renderLogs();

	// --- Listen for Real-time Updates ---
	storage.onChanged((changes) => {
		if (changes[STORAGE_KEYS.PRIVACY_LOGS]) {
			renderLogs();
		}
	});

	// --- 2. Action Handlers ---
	if (UI.clearBtn) {
		UI.clearBtn.addEventListener('click', async () => {
			if (confirm('Are you sure you want to clear all activity logs?')) {
				await storage.setLocal({ [STORAGE_KEYS.PRIVACY_LOGS]: [] });
				renderLogs();
			}
		});
	}

	if (UI.backBtn) {
		UI.backBtn.addEventListener('click', () => {
			window.close();
		});
	}
});
