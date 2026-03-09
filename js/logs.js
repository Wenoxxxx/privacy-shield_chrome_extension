document.addEventListener('DOMContentLoaded', function () {
	const logsBody = document.getElementById('logs-body');
	const noLogs = document.getElementById('no-logs');
	const clearBtn = document.getElementById('clear-logs');
	const backBtn = document.getElementById('back-to-popup');

	// 1. Load and Render Logs
	function renderLogs() {
		chrome.storage.local.get(['privacyLogs'], function (result) {
			const logs = result.privacyLogs || [];

			if (logs.length === 0) {
				logsBody.innerHTML = '';
				noLogs.style.display = 'block';
				return;
			}

			noLogs.style.display = 'none';
			logsBody.innerHTML = logs.map(log => {
				const date = new Date(log.timestamp);
				const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
				const typeClass = `type-${log.type.toLowerCase()}`;

				return `
                    <tr>
                        <td>${timeString}</td>
                        <td><span class="log-type ${typeClass}">${log.type}</span></td>
                        <td>${log.description}</td>
                        <td><a href="${log.url}" target="_blank" class="log-url">${new URL(log.url).hostname}</a></td>
                    </tr>
                `;
			}).join('');
		});
	}

	renderLogs();

	// 2. Clear Logs Logic
	clearBtn.addEventListener('click', function () {
		if (confirm('Are you sure you want to clear all activity logs?')) {
			chrome.storage.local.set({ privacyLogs: [] }, function () {
				renderLogs();
			});
		}
	});

	// 3. Back to Dashboard (if opened from popup)
	backBtn.addEventListener('click', function () {
		window.close(); // Close the tab if it was opened via popup
	});
});
