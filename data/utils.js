const TIME_BETWEEN_REQUESTS = 1300;

export function api_call(url) {
	return new Promise((resolve, reject) => {
		setTimeout(async () => {
			try {
				const data = await fetch(url);
				resolve(data);
			} catch (e) {
				reject(e);
			}
		}, TIME_BETWEEN_REQUESTS);
	});
}

export function deep_copy(obj) {
	if (obj === null || typeof obj !== "object") {
		return obj;
	}

	if (Array.isArray(obj)) {
		const copy = [];
		for (let i = 0; i < obj.length; i++) {
			copy[i] = deep_copy(obj[i]);
		}
		return copy;
	}

	const copy = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			copy[key] = deep_copy(obj[key]);
		}
	}
	return copy;
}

export async function fetch_with_retries(url, timeout = 3000) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			const response = await api_call(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json(); // or `return response` if you want the raw response
		} catch (error) {
			if (attempt < 3) {
				console.warn(
					`Attempt ${attempt} failed. Retrying in ${timeout}ms...`,
				);
				await new Promise((resolve) => setTimeout(resolve, timeout));
			} else {
				console.error(`Attempt ${attempt} failed. Returning null.`);
				return null;
			}
		}
	}
}
