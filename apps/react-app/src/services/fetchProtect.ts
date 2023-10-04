const fetchProtect = async (
	url: string,
	options: RequestInit,
	navigate: (to: string) => void
) => {
	console.log("fetchProtect called with", url, options);
	try {
		const response = await fetch(url, options);
		if (!response.ok) {
			let serverMessage = "No server message";
			try {
				const data = await response.json();
				serverMessage = data.error ? data.error : serverMessage;
			} catch (e) {}
			throw new Error(
				`HTTP error! Status: ${response.status} - ${serverMessage}`
			);
		}

		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			return await response.json();
		} else {
			throw new Error("Response is not in JSON format");
		}
	} catch (error) {
		console.error("Error in fetchProtect", error);
		if (error instanceof Error) {
			if (error.message.includes("403")) {
				navigate("/?error=403");
			} else if (error.message.includes("Failed to fetch")) {
				navigate("/");
			}
		}
		throw error;
	}
};

export default fetchProtect;
