import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { fetchBuildings, fetchAllRooms } from "./api";
import SelectedRooms from "./SelectedRooms";
import RoomList from "./RoomList";
import L from "leaflet";
import redMarkerIcon from "./images/marker-icon-red.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const apiKey = process.env.REACT_APP_OPENROUTESERVICE_API_KEY;

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
	const [routeCoordinates, setRouteCoordinates] = useState(null);
	const [routeTime, setRouteTime] = useState(null);
	const [walkingTimes, setWalkingTimes] = useState([]);

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

	const clearAllRooms = () => {
		setSelectedRooms([]);
	};

	const fetchWalkingTime = async (roomA, roomB) => {
		const start = [roomA.rooms_lon, roomA.rooms_lat];
		const end = [roomB.rooms_lon, roomB.rooms_lat];

		const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`;

		const response = await fetch(url);
		const data = await response.json();

		if (data.error || !data.features || data.features.length === 0) {
			throw new Error("No route found");
		}

		const duration = data.features[0].properties.segments[0].duration; // in seconds

		return duration;
	};

	const getWalkingTimes = useCallback(async () => {
		const times = [];

		for (let i = 0; i < selectedRooms.length; i++) {
			for (let j = i + 1; j < selectedRooms.length; j++) {
				const roomA = selectedRooms[i];
				const roomB = selectedRooms[j];

				let walkingTime;

				if (roomA.rooms_shortname === roomB.rooms_shortname) {
					walkingTime = 60; // seconds
				} else {
					try {
						const duration = await fetchWalkingTime(roomA, roomB);
						walkingTime = duration; // duration in seconds
					} catch (error) {
						console.error(`Error fetching walking time between ${roomA.rooms_name} and ${roomB.rooms_name}:`, error);
						walkingTime = null;
					}
				}

				const timeInMinutes = walkingTime ? (walkingTime / 60).toFixed(2) : "N/A";

				times.push({
					roomA: roomA.rooms_name,
					roomB: roomB.rooms_name,
					time: timeInMinutes,
				});
			}
		}

		return times;
	}, [selectedRooms]);

	// Fetch walking times whenever selectedRooms changes
	useEffect(() => {
		const fetchWalkingTimes = async () => {
			const times = await getWalkingTimes();
			setWalkingTimes(times);
		};

		if (selectedRooms.length > 0) {
			fetchWalkingTimes();
		} else {
			setWalkingTimes([]);
		}
	}, [selectedRooms, getWalkingTimes]);

	useEffect(() => {
		const fetchRoute = async () => {
			if (selectedRooms.length === 2) {
				const roomA = selectedRooms[0];
				const roomB = selectedRooms[1];
				const coordinates = [
					[roomA.rooms_lon, roomA.rooms_lat],
					[roomB.rooms_lon, roomB.rooms_lat],
				];

				try {
					const response = await fetch(
						`https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${coordinates[0][0]},${coordinates[0][1]}&end=${coordinates[1][0]},${coordinates[1][1]}`
					);

					const data = await response.json();

					if (data && data.features && data.features.length > 0) {
						const geometry = data.features[0].geometry;
						const decodedCoordinates = geometry.coordinates.map((coord) => [
							coord[1], // Latitude
							coord[0], // Longitude
						]);
						setRouteCoordinates(decodedCoordinates);

						const duration = data.features[0].properties.segments[0].duration; // in seconds
						setRouteTime((duration / 60).toFixed(2)); // convert to minutes
					}
				} catch (error) {
					console.error("Error fetching route:", error);
					setRouteCoordinates(null);
					setRouteTime(null);
				}
			} else {
				// Clear the route if not exactly two rooms are selected
				setRouteCoordinates(null);
				setRouteTime(null);
			}
		};

		fetchRoute();
	}, [selectedRooms]);

	// Group rooms by building
	const roomsByBuilding = allRooms.reduce((acc, room) => {
		const building = room.rooms_shortname;
		if (!acc[building]) {
			acc[building] = [];
		}
		acc[building].push(room);
		return acc;
	}, {});

	const buildingRefs = useRef({});

	return (
		<div className="app-container">
			<div className="map-container">
				<div className="logo">UBC Campus Explorer</div>
				<MapContainer center={position} zoom={16} id="map">
					<TileLayer
						attribution="&copy; OpenStreetMap contributors"
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{Object.keys(roomsByBuilding).map((buildingShortName, index) => {
						const roomsInBuilding = roomsByBuilding[buildingShortName];
						const buildingLat = roomsInBuilding[0].rooms_lat;
						const buildingLon = roomsInBuilding[0].rooms_lon;
						const buildingFullName = roomsInBuilding[0].rooms_fullname;
						const buildingAddress = roomsInBuilding[0].rooms_address;

						return (
							<Marker
								key={index}
								position={[buildingLat, buildingLon]}
								icon={redIcon}
								eventHandlers={{
									click: () => {
										const ref = buildingRefs.current[buildingFullName];
										if (ref && ref.scrollIntoView) {
											ref.scrollIntoView({
												behavior: "smooth",
												block: "start",
											});
										}
									},
								}}
							>
								<Popup>
									<div>
										<h3>{buildingFullName}</h3>
										<p>{buildingAddress}</p>
										<div className="popup-room-list">
											<ul>
												{roomsInBuilding.map((room) => (
													<li key={room.rooms_name}>
														{room.rooms_name} - Seats: {room.rooms_seats}
													</li>
												))}
											</ul>
										</div>
									</div>
								</Popup>
							</Marker>
						);
					})}

					{routeCoordinates && (
						<Polyline positions={routeCoordinates} color="blue">
							<Tooltip permanent direction="center">
								Walking Time: {routeTime} minutes
							</Tooltip>
						</Polyline>
					)}
				</MapContainer>
				<SelectedRooms
					selectedRooms={selectedRooms}
					toggleRoomSelection={toggleRoomSelection}
					clearAllRooms={clearAllRooms}
					walkingTimes={walkingTimes}
				/>
			</div>
			<RoomList
				rooms={allRooms}
				selectedRooms={selectedRooms}
				toggleRoomSelection={toggleRoomSelection}
				buildingRefs={buildingRefs}
			/>
		</div>
	);
}

export default MapView;
