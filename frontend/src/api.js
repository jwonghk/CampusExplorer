import axios from "axios";

const API_BASE_URL = "http://localhost:4321";

const api = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

export const fetchBuildings = async () => {
	const query = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: ["rooms_fullname", "rooms_shortname", "rooms_lat", "rooms_lon"],
			ORDER: "rooms_shortname",
		},
		TRANSFORMATIONS: {
			GROUP: ["rooms_shortname", "rooms_fullname", "rooms_lat", "rooms_lon"],
			APPLY: [],
		},
	};

	try {
		const response = await api.post("/query", query);
		return response.data.result;
	} catch (error) {
		if (error.response) {
			console.error("Error fetching buildings:", error.response.data);
		} else if (error.request) {
			console.error("No response received:", error.request);
		} else {
			console.error("Error:", error.message);
		}
		throw new Error("Failed to fetch buildings data");
	}
};

export const fetchRoomsForBuilding = async (shortname) => {
	const query = {
		WHERE: {
			IS: {
				rooms_shortname: shortname,
			},
		},
		OPTIONS: {
			COLUMNS: [
				"rooms_fullname",
				"rooms_shortname",
				"rooms_number",
				"rooms_name",
				"rooms_address",
				"rooms_seats",
				"rooms_lat",
				"rooms_lon",
			],
		},
	};

	try {
		const response = await api.post("/query", query);
		return response.data.result;
	} catch (error) {
		if (error.response) {
			console.error(`Error fetching rooms for building ${shortname}:`, error.response.data);
		} else if (error.request) {
			console.error("No response received:", error.request);
		} else {
			console.error("Error:", error.message);
		}
		throw new Error(`Failed to fetch rooms for building ${shortname}`);
	}
};

export const fetchAllRooms = async () => {
	const query = {
		WHERE: {},
		OPTIONS: {
			COLUMNS: [
				"rooms_fullname",
				"rooms_shortname",
				"rooms_number",
				"rooms_name",
				"rooms_address",
				"rooms_seats",
				"rooms_lat",
				"rooms_lon",
			],
			ORDER: {
				dir: "UP",
				keys: ["rooms_fullname", "rooms_number"],
			},
		},
	};

	try {
		const response = await api.post("/query", query);
		return response.data.result;
	} catch (error) {
		if (error.response) {
			console.error("Error fetching all rooms:", error.response.data);
		} else if (error.request) {
			console.error("No response received:", error.request);
		} else {
			console.error("Error:", error.message);
		}
		throw new Error("Failed to fetch all rooms data");
	}
};

export default api;
