import React from "react";
import "./SelectedRooms.css";

function SelectedRooms({ selectedRooms, toggleRoomSelection, clearAllRooms, walkingTimes }) {
	return (
		<div className="selected-rooms">
			<div className="selected-rooms-header">
				<h2>Selected Rooms ({selectedRooms.length}/5)</h2>
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
						<p>Furniture: {room.rooms_furniture}</p>
					</div>
				))}
			</div>
			{walkingTimes.length > 0 && (
				<div className="walking-times">
					<h2>Rooms Information</h2>
					<div className="table-container">
						<table>
							<thead>
								<tr>
									<th>Relation</th>
									<th>Building A</th>
									<th>Room A</th>
									<th>Address A</th>
									<th>Seats A</th>
									<th>Furniture A</th>
									<th>Building B</th>
									<th>Room B</th>
									<th>Address B</th>
									<th>Seats B</th>
									<th>Furniture B</th>
									<th>Distance (m)</th>
									<th>Duration (min)</th>
								</tr>
							</thead>
							<tbody>
								{walkingTimes.map((wt, index) => (
									<tr key={index}>
										<td>
											{wt.roomA} → {wt.roomB}
										</td>
										<td>{wt.roomAshort}</td>
										<td>{wt.roomA}</td>
										<td>{wt.roomAaddr}</td>
										<td>{wt.roomAseats}</td>
										<td>{wt.roomAFurniture}</td>
										<td>{wt.roomBshort}</td>
										<td>{wt.roomB}</td>
										<td>{wt.roomBaddr}</td>
										<td>{wt.roomBseats}</td>
										<td>{wt.roomBFurniture}</td>
										<td>{wt.distance}</td>
										<td>{wt.time}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

export default SelectedRooms;
