// api.js
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
		console.error("Error fetching buildings:", error);
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
		console.error("Error fetching rooms:", error);
		throw new Error(`Failed to fetch rooms for building ${shortname}`);
	}
};

export default api;
