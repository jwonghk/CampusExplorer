import React from 'react';

function RoomSelection({
  rooms,
  selectedRooms,
  toggleRoomSelection,
  closeSelection,
}) {
  return (
    <div className="room-selection">
      <button onClick={closeSelection}>Close</button>
      <h2>Select Rooms (up to 5)</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.rooms_name}>
            <label>
              <input
                type="checkbox"
                checked={selectedRooms.some(
                  (selected) => selected.rooms_name === room.rooms_name
                )}
                onChange={() => toggleRoomSelection(room)}
                disabled={
                  !selectedRooms.some(
                    (selected) => selected.rooms_name === room.rooms_name
                  ) && selectedRooms.length >= 5
                }
              />
              {room.rooms_name} - Seats: {room.rooms_seats}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomSelection;
