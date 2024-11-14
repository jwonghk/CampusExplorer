import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import "./leaflet.config";
import { fetchBuildings, fetchRoomsForBuilding } from "./api";
import RoomSelection from "./RoomSelection";
import SelectedRooms from "./SelectedRooms";

function MapView() {
	const position = [49.2606, -123.246]; // Coordinates for UBC
	const [buildings, setBuildings] = useState([]);
	const [selectedRooms, setSelectedRooms] = useState([]);
	const [currentBuildingRooms, setCurrentBuildingRooms] = useState([]);
	const [showRoomSelection, setShowRoomSelection] = useState(false);

	useEffect(() => {
		const getBuildings = async () => {
			try {
				const data = await fetchBuildings();
				setBuildings(data);
			} catch (error) {
				console.error("Failed to load buildings:", error);
			}
		};

		getBuildings();
	}, []);

	const handleBuildingClick = async (building) => {
		try {
			const rooms = await fetchRoomsForBuilding(building.rooms_shortname);
			setCurrentBuildingRooms(rooms);
			setShowRoomSelection(true);
		} catch (error) {
			console.error("Failed to load rooms:", error);
		}
	};

	const toggleRoomSelection = (room) => {
		setSelectedRooms((prevSelected) => {
			const isSelected = prevSelected.some((selected) => selected.rooms_name === room.rooms_name);

			if (isSelected) {
				return prevSelected.filter((selected) => selected.rooms_name !== room.rooms_name);
			} else if (prevSelected.length < 5) {
				return [...prevSelected, room];
			} else {
				return prevSelected;
			}
		});
	};

	const closeRoomSelection = () => {
		setShowRoomSelection(false);
		setCurrentBuildingRooms([]);
	};

	const calculateDistance = (lat1, lon1, lat2, lon2) => {
		const toRad = (value) => (value * Math.PI) / 180;
		const R = 6371e3; // Earth's radius in meters

		const φ1 = toRad(lat1);
		const φ2 = toRad(lat2);
		const Δφ = toRad(lat2 - lat1);
		const Δλ = toRad(lon2 - lon1);

		const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		const distance = R * c; // in meters
		return distance;
	};

	const getWalkingTimes = () => {
		const walkingSpeed = 1.4; // meters per second
		const times = [];

		for (let i = 0; i < selectedRooms.length; i++) {
			for (let j = i + 1; j < selectedRooms.length; j++) {
				const roomA = selectedRooms[i];
				const roomB = selectedRooms[j];

				let walkingTime;

				if (roomA.rooms_shortname === roomB.rooms_shortname) {
					// Same building, minimal walking time
					walkingTime = 60; // seconds
				} else {
					const distance = calculateDistance(roomA.rooms_lat, roomA.rooms_lon, roomB.rooms_lat, roomB.rooms_lon);
					walkingTime = distance / walkingSpeed; // seconds
				}

				const timeInMinutes = (walkingTime / 60).toFixed(2);

				times.push({
					roomA: roomA.rooms_name,
					roomB: roomB.rooms_name,
					time: timeInMinutes,
				});
			}
		}

		return times;
	};

	const walkingTimes = getWalkingTimes();

	return (
		<div>
			<MapContainer center={position} zoom={16} id="map">
				<TileLayer
					attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{buildings.map((building, index) => (
					<Marker
						key={index}
						position={[building.rooms_lat, building.rooms_lon]}
						eventHandlers={{
							click: () => {
								handleBuildingClick(building);
							},
						}}
					>
						<Popup>{building.rooms_fullname}</Popup>
					</Marker>
				))}
			</MapContainer>
			{showRoomSelection && (
				<RoomSelection
					rooms={currentBuildingRooms}
					selectedRooms={selectedRooms}
					toggleRoomSelection={toggleRoomSelection}
					closeSelection={closeRoomSelection}
				/>
			)}
			<SelectedRooms selectedRooms={selectedRooms} walkingTimes={walkingTimes} />
		</div>
	);
}

export default MapView;
