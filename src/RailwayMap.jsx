import React, { useState } from "react";

const generateStations = (count) =>
  Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));

const makeEdgeKey = (a, b) => [a, b].sort().join("-");

const DynamicNonLinearGraph = () => {
  const [stationCount, setStationCount] = useState(3);
  const [stations, setStations] = useState(generateStations(3));
  const [edges, setEdges] = useState([]);
  const [weights, setWeights] = useState({});
  
  // For adding new edge form
  const [newEdgeStart, setNewEdgeStart] = useState(stations[0]);
  const [newEdgeEnd, setNewEdgeEnd] = useState(stations[1]);
  const [newEdgeWeight, setNewEdgeWeight] = useState(1);

  // Update stations list & reset edges/weights when station count changes
  const changeStationCount = (count) => {
    const c = Math.max(2, Math.min(26, count)); // limit 2-26
    setStationCount(c);
    const newStations = generateStations(c);
    setStations(newStations);
    setEdges([]);
    setWeights({});
    setNewEdgeStart(newStations[0]);
    setNewEdgeEnd(newStations[1] || newStations[0]);
  };

  // Add new edge on form submit
  const addEdge = () => {
    if (newEdgeStart === newEdgeEnd) {
      alert("Start and end stations must differ");
      return;
    }
    const key = makeEdgeKey(newEdgeStart, newEdgeEnd);
    if (edges.find(([a, b]) => makeEdgeKey(a, b) === key)) {
      alert("Edge already exists");
      return;
    }
    setEdges((prev) => [...prev, [newEdgeStart, newEdgeEnd]]);
    setWeights((prev) => ({ ...prev, [key]: Number(newEdgeWeight) }));
  };

  // Update edge weight
  const updateWeight = (key, val) => {
    setWeights((prev) => ({ ...prev, [key]: Number(val) }));
  };

  return (
    <div style={{ padding: 20 }}>
      <h3>Dynamic Station and Edge Input</h3>
      <label>
        Number of Stations (2-26):{" "}
        <input
          type="number"
          value={stationCount}
          min={2}
          max={26}
          onChange={(e) => changeStationCount(Number(e.target.value))}
        />
      </label>
      <p>Stations: {stations.join(", ")}</p>

      <div style={{ marginTop: 20, marginBottom: 20 }}>
        <h4>Add New Edge</h4>
        <select
          value={newEdgeStart}
          onChange={(e) => setNewEdgeStart(e.target.value)}
        >
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>{" "}
        →{" "}
        <select value={newEdgeEnd} onChange={(e) => setNewEdgeEnd(e.target.value)}>
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>{" "}
        Weight:{" "}
        <input
          type="number"
          min={1}
          max={100}
          value={newEdgeWeight}
          onChange={(e) => setNewEdgeWeight(e.target.value)}
          style={{ width: 60 }}
        />
        <button onClick={addEdge} style={{ marginLeft: 10 }}>
          Add Edge
        </button>
      </div>

      <h4>Edges and Weights</h4>
      {edges.length === 0 && <p>No edges added.</p>}
      {edges.map(([a, b]) => {
        const key = makeEdgeKey(a, b);
        return (
          <div key={key} style={{ marginBottom: 6 }}>
            <strong>
              {a} - {b}
            </strong>{" "}
            Weight:{" "}
            <input
              type="number"
              min={1}
              max={100}
              value={weights[key]}
              onChange={(e) => updateWeight(key, e.target.value)}
              style={{ width: 60 }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default DynamicNonLinearGraph;
