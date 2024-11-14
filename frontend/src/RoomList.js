import React from "react";
import "./RoomList.css";

function RoomList({ rooms, selectedRooms, toggleRoomSelection, buildingRefs }) {
	// Group rooms by building
	const roomsByBuilding = rooms.reduce((acc, room) => {
		const building = room.rooms_fullname;
		if (!acc[building]) {
			acc[building] = [];
		}
		acc[building].push(room);
		return acc;
	}, {});

	return (
		<div className="room-list">
			<h2>Rooms</h2>
			<div className="room-list-container">
				{Object.keys(roomsByBuilding).map((buildingName) => (
					<div
						key={buildingName}
						className="building-group"
						ref={(el) => {
							buildingRefs.current[buildingName] = el;
						}}
					>
						<h3>{buildingName}</h3>
						<ul>
							{roomsByBuilding[buildingName].map((room) => {
								const isSelected = selectedRooms.some((selected) => selected.rooms_name === room.rooms_name);
								return (
									<li
										key={room.rooms_name}
										className={`room-item ${isSelected ? "selected" : ""}`}
										onClick={() => toggleRoomSelection(room)}
									>
										<div className="room-details">
											<span className="room-name">{room.rooms_name}</span>
											<span className="room-info">Seats: {room.rooms_seats}</span>
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}

export default RoomList;
