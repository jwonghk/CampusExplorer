import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./leaflet.config";
import { fetchBuildings, fetchRoomsForBuilding } from "./api";

function MapView() {
	const position = [49.2606, -123.246]; // Coordinates for UBC

	const [buildings, setBuildings] = useState([]);

	useEffect(() => {
		const getBuildings = async () => {
			try {
				const data = await fetchBuildings();
				setBuildings(data);
			} catch (error) {
				console.error("Error fetching buildings:", error);
			}
		};

		getBuildings();
	}, []);

	const handleBuildingClick = async (building) => {
		try {
			const rooms = await fetchRoomsForBuilding(building.rooms_shortname);
			console.log("Rooms in building:", rooms);
		} catch (error) {
			console.error("Error fetching rooms:", error);
		}
	};

	return (
		<MapContainer center={position} zoom={15} id="map">
			<TileLayer
				attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
				url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
			/>
			{buildings.map((building) => (
				<Marker
					key={building.rooms_shortname}
					position={[building.rooms_lat, building.rooms_lon]}
					eventHandlers={{
						click: () => handleBuildingClick(building),
					}}
				>
					<Popup>{building.rooms_fullname}</Popup>
				</Marker>
			))}
		</MapContainer>
	);
}

export default MapView;
