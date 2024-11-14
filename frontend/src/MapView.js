import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { fetchBuildings, fetchAllRooms } from "./api";
import SelectedRooms from "./SelectedRooms";
import RoomList from "./RoomList";
import L from "leaflet";
import redMarkerIcon from "./images/marker-icon-red.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const redIcon = new L.Icon({
	iconUrl: redMarkerIcon,
	shadowUrl: markerShadow,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	shadowSize: [41, 41],
});

function MapView() {
	const position = [49.2606, -123.246]; // Coordinates for UBC
	const [buildings, setBuildings] = useState([]); // eslint-disable-line no-unused-vars
	const [allRooms, setAllRooms] = useState([]);
	const [selectedRooms, setSelectedRooms] = useState([]);

	useEffect(() => {
		const getBuildings = async () => {
			try {
				const data = await fetchBuildings();
				setBuildings(data);
			} catch (error) {
				console.error("Failed to load buildings:", error);
			}
		};

		const getAllRooms = async () => {
			try {
				const roomsData = await fetchAllRooms();
				setAllRooms(roomsData);
			} catch (error) {
				console.error("Failed to load all rooms:", error);
			}
		};

		getBuildings();
		getAllRooms();
	}, []);

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

	// Start ChatGPT
	const calculateDistance = (lat1, lon1, lat2, lon2) => {
		const toRadians = (value) => (value * Math.PI) / 180;
		const radius = 6371e3; // Earth's radius in meters

		const latitude1 = toRadians(lat1);
		const latitude2 = toRadians(lat2);
		const deltaLatitude = toRadians(lat2 - lat1);
		const deltaLongitude = toRadians(lon2 - lon1);

		const a =
			Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		const distance = radius * c; // in meters
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
	// End ChatGPT

	const walkingTimes = getWalkingTimes();

	return (
		<div className="app-container">
			<div className="map-container">
				<div className="logo">Campus Explorer</div>
				<MapContainer center={position} zoom={16} id="map">
					<TileLayer
						attribution="&copy; OpenStreetMap contributors"
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					{allRooms.map((room, index) => {
						const isSelected = selectedRooms.some((selected) => selected.rooms_name === room.rooms_name);
						return (
							<Marker key={index} position={[room.rooms_lat, room.rooms_lon]} icon={redIcon}>
								<Popup>
									<div>
										<h3>{room.rooms_name}</h3>
										<p>{room.rooms_fullname}</p>
										<p>Seats: {room.rooms_seats}</p>
										{!isSelected ? (
											<button onClick={() => toggleRoomSelection(room)}>Add Room</button>
										) : (
											<button onClick={() => toggleRoomSelection(room)}>Remove Room</button>
										)}
									</div>
								</Popup>
							</Marker>
						);
					})}
				</MapContainer>
				<SelectedRooms
					selectedRooms={selectedRooms}
					toggleRoomSelection={toggleRoomSelection}
					walkingTimes={walkingTimes}
				/>
			</div>
			<RoomList rooms={allRooms} selectedRooms={selectedRooms} toggleRoomSelection={toggleRoomSelection} />
		</div>
	);
}

export default MapView;
