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
						<p>Furniture : {room.rooms_furniture}</p>
					</div>
				))}
			</div>
			{walkingTimes.length > 0 && (
				<div className="walking-times">
					<h2>Walking Times Between Rooms</h2>
					<ul>
						<table>
							<tr>
								<th> &#10140; </th>
								<th> Room 1</th>
								<th> Building for 1</th>
								<th> Address of Building 1</th>
								<th> Seats Room 1</th>
								<th> Room 1 Furniture</th>

								<th> Room 2</th>
								<th> Building for 2</th>
								<th> Address of Building 2</th>
								<th> Seats Room 2</th>
								<th> Room 2 Furniture</th>
								<th> Distance</th>
								<th> Duration</th>
							</tr>

							{walkingTimes.map((wt, index) => (
								<tr>
									<th id="relation">
										{" "}
										{wt.roomA} {wt.roomB}{" "}
									</th>
									<th id="roomA"> {wt.roomA} </th>
									<th id="roomAshort"> {wt.roomAshort} </th>
									<th id="roomAaddr"> {wt.roomAaddr} </th>
									<th id="roomAseats"> {wt.roomAseats} </th>
									<th id="roomFur"> {wt.roomAFurniture}</th>

									<th id="roomB"> {wt.roomB} </th>
									<th id="roomBshort"> {wt.roomBshort} </th>
									<th id="roomBaddr"> {wt.roomBaddr} </th>
									<th id="roomBseats"> {wt.roomBseats} </th>
									<th id="roomFur"> {wt.roomBFurniture}</th>

									<th id="distance"> Distance</th>
									<th id="travelTime"> {wt.time} minutes</th>
								</tr>
							))}
						</table>
					</ul>
				</div>
			)}
		</div>
	);
}

export default SelectedRooms;
