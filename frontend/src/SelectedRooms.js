import React from "react";
import "./SelectedRooms.css";

function SelectedRooms({ selectedRooms, toggleRoomSelection, clearAllRooms, walkingTimes }) {
	return (
		<div className="selected-rooms">
			<div className="selected-rooms-header">
				<h2>Selected Rooms</h2>
				{selectedRooms.length > 0 && (
					<button className="clear-all-button" onClick={clearAllRooms}>
						Remove All Rooms
					</button>
				)}
			</div>
			{selectedRooms.length === 0 && <p>No rooms selected.</p>}
			<div className="cards-container">
				{selectedRooms.map((room) => (
					<div key={room.rooms_name} className="room-card">
						<button className="card-remove-button" onClick={() => toggleRoomSelection(room)}>
							×
						</button>
						<h3>
							{room.rooms_fullname} ({room.rooms_shortname})
						</h3>
						<p>Room Number: {room.rooms_number}</p>
						<p>Address: {room.rooms_address}</p>
						<p>Seats: {room.rooms_seats}</p>
					</div>
				))}
			</div>
			{walkingTimes.length > 0 && (
				<div className="walking-times">
					<h2>Walking Times Between Rooms</h2>
					<ul>
						{walkingTimes.map((wt, index) => (
							<li key={index}>
								{wt.roomA} ↔ {wt.roomB}: {wt.time} minutes
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export default SelectedRooms;
