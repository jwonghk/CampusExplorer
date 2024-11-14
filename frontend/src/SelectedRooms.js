import React from "react";

function SelectedRooms({ selectedRooms, walkingTimes }) {
	return (
		<div className="selected-rooms">
			<h2>Selected Rooms</h2>
			{selectedRooms.length === 0 && <p>No rooms selected.</p>}
			{selectedRooms.map((room) => (
				<div key={room.rooms_name} className="room-info">
					<h3>
						{room.rooms_fullname} ({room.rooms_shortname})
					</h3>
					<p>Room Number: {room.rooms_number}</p>
					<p>Address: {room.rooms_address}</p>
					<p>Seats: {room.rooms_seats}</p>
				</div>
			))}
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
