import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

// --- Helper: Priority Queue for Dijkstra's Algorithm ---
class PriorityQueue {
    constructor() {
        this.values = [];
    }
    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }
    dequeue() {
        return this.values.shift();
    }
    sort() {
        this.values.sort((a, b) => a.priority - b.priority);
    }
    isEmpty() {
        return this.values.length === 0;
    }
}

// --- Main Application Component ---
export default function App() {
    // --- State Management ---
    const [numStations, setNumStations] = useState(6);
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [sourceNode, setSourceNode] = useState('');
    const [destNode, setDestNode] = useState('');
    const [shortestPath, setShortestPath] = useState([]);
    const [trainPosition, setTrainPosition] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false); // True when a journey is active
    const [logs, setLogs] = useState([]);

    // --- D3 References and Simulation ---
    const svgRef = useRef();
    const simulationRef = useRef();

    // --- Utility Functions ---
    const addLog = (message) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev].slice(0, 10));
    };

    const stopSimulation = useCallback(() => {
        setIsSimulating(false);
        setTrainPosition(null);
        // Keep shortestPath to show the last calculated route, but clear train position
        addLog("Simulation stopped.");
    }, []);

    // --- Graph Initialization ---
    useEffect(() => {
        if (isNaN(numStations) || numStations < 2 || numStations > 15) return;

        const stationIds = Array.from({ length: numStations }, (_, i) => String.fromCharCode(65 + i));
        const newNodes = stationIds.map(id => ({ id }));
        setNodes(newNodes);

        // Reset related states
        setEdges([]);
        setSourceNode('');
        setDestNode('');
        setShortestPath([]);
        stopSimulation();
        addLog(`Generated ${numStations} new stations.`);
    }, [numStations, stopSimulation]);

    // --- Dijkstra's Algorithm Implementation ---
    const dijkstra = useCallback((startId, endId) => {
        if (!startId || !endId || nodes.length === 0) return [];

        const distances = {};
        const previous = {};
        const pq = new PriorityQueue();
        const path = [];
        
        nodes.forEach(node => {
            distances[node.id] = node.id === startId ? 0 : Infinity;
            previous[node.id] = null;
        });
        
        if (distances[startId] === 0) {
            pq.enqueue(startId, 0);
        }

        while (!pq.isEmpty()) {
            const { val: smallest } = pq.dequeue();

            if (smallest === endId) {
                let currentNode = endId;
                while (currentNode) {
                    path.unshift(currentNode);
                    currentNode = previous[currentNode];
                }
                return path;
            }

            if (smallest && distances[smallest] !== Infinity) {
                const neighbors = edges.filter(edge => edge.source === smallest || edge.target === smallest);
                
                neighbors.forEach(neighborEdge => {
                    const neighborNodeId = neighborEdge.source === smallest ? neighborEdge.target : neighborEdge.source;
                    const candidate = distances[smallest] + neighborEdge.weight;

                    if (candidate < distances[neighborNodeId]) {
                        distances[neighborNodeId] = candidate;
                        previous[neighborNodeId] = smallest;
                        pq.enqueue(neighborNodeId, candidate);
                    }
                });
            }
        }
        return [];
    }, [nodes, edges]);
    
    // --- Dynamic Re-routing on Edge Change while paused at a station ---
    useEffect(() => {
        // This effect triggers if an edge weight changes during an active simulation
        if (isSimulating && trainPosition && destNode) {
            addLog(`Network change detected. Recalculating path from current station ${trainPosition}.`);
            const newPathSegment = dijkstra(trainPosition, destNode);

            if (newPathSegment.length > 0) {
                const oldPathTraversed = shortestPath.slice(0, shortestPath.indexOf(trainPosition));
                const newFullPath = [...oldPathTraversed, ...newPathSegment];
                
                // Only update and log if the path has actually changed
                if (JSON.stringify(newFullPath) !== JSON.stringify(shortestPath)) {
                    setShortestPath(newFullPath);
                    addLog(`Path updated. New route: ${newFullPath.join(' -> ')}`);
                }
            } else {
                 addLog(`No alternative path found from ${trainPosition}. Stopping simulation.`);
                 stopSimulation();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edges, dijkstra]);


    // --- D3 Visualization ---
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        const width = svg.node().getBoundingClientRect().width;
        const height = svg.node().getBoundingClientRect().height;
        svg.append("defs").append("marker").attr("id", "arrowhead").attr("viewBox", "-0 -5 10 10").attr("refX", 23).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 13).attr("markerHeight", 13).attr("xoverflow", "visible").append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", "#999").style("stroke","none");
        const linkGroup = svg.append("g").attr("class", "links");
        const nodeGroup = svg.append("g").attr("class", "nodes");
        const labelGroup = svg.append("g").attr("class", "labels");
        const weightLabelGroup = svg.append("g").attr("class", "weight-labels");
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation().force("link", d3.forceLink().id(d => d.id).distance(150)).force("charge", d3.forceManyBody().strength(-400)).force("center", d3.forceCenter(width / 2, height / 2));
        }
        const simulation = simulationRef.current;
        const nodesCopy = JSON.parse(JSON.stringify(nodes));
        const edgesCopy = JSON.parse(JSON.stringify(edges));
        simulation.nodes(nodesCopy);
        simulation.force("link").links(edgesCopy);
        const link = linkGroup.selectAll("line").data(edgesCopy).join("line")
            .attr("stroke-width", d => {
                const sourceIndex = shortestPath.indexOf(d.source.id);
                const targetIndex = shortestPath.indexOf(d.target.id);
                const inPath = sourceIndex > -1 && targetIndex > -1 && Math.abs(sourceIndex - targetIndex) === 1;
                return inPath ? 6 : 2.5;
            })
            .attr("stroke", d => {
                const sourceIndex = shortestPath.indexOf(d.source.id);
                const targetIndex = shortestPath.indexOf(d.target.id);
                if (sourceIndex > -1 && targetIndex > -1 && Math.abs(sourceIndex - targetIndex) === 1) {
                    return "#34D399"; // Emerald for current path
                }
                return "#9CA3AF";
            });
        
        const node = nodeGroup.selectAll("circle").data(nodesCopy).join("circle").attr("r", 15).attr("fill", d => {
            if (d.id === trainPosition) return "#FBBF24"; if (d.id === sourceNode) return "#60A5FA"; if (d.id === destNode) return "#F87171"; if (shortestPath.includes(d.id)) return "#A7F3D0"; return "#E5E7EB";
        }).attr("stroke", "#1F2937").attr("stroke-width", 2).call(d3.drag().on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y;
        }).on("drag", (event, d) => {
            d.fx = event.x; d.fy = event.y;
        }).on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null;
        }));
        const label = labelGroup.selectAll("text").data(nodesCopy).join("text").text(d => d.id).attr("text-anchor", "middle").attr("dy", ".35em").attr("fill", "#1F2937").style("font-weight", "bold");
        const weightLabel = weightLabelGroup.selectAll("text").data(edgesCopy).join("text").text(d => d.weight).attr("text-anchor", "middle").attr("fill", "#4B5563").style("font-size", "12px");
        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
            node.attr("cx", d => d.x).attr("cy", d => d.y);
            label.attr("x", d => d.x).attr("y", d => d.y);
            weightLabel.attr("x", d => (d.source.x + d.target.x) / 2).attr("y", d => (d.source.y + d.target.y) / 2);
        });
        simulation.alpha(1).restart();
    }, [nodes, edges, shortestPath, sourceNode, destNode, trainPosition]);

    // --- Event Handlers ---
    const handleAddEdge = (e) => {
        e.preventDefault();
        const from = e.target.elements.from.value;
        const to = e.target.elements.to.value;
        const weight = parseInt(e.target.elements.weight.value, 10);
        if (from === to || isNaN(weight) || weight <= 0) {
            addLog("Error: Invalid edge. Ensure stations are different and weight is positive.");
            return;
        }
        const existingEdge = edges.find(edge => (edge.source === from && edge.target === to) || (edge.source === to && edge.target === from));
        if (existingEdge) {
            setEdges(edges.map(edge => edge === existingEdge ? { ...edge, weight } : edge));
            addLog(`Updated weight between ${from} and ${to} to ${weight}.`);
        } else {
            setEdges([...edges, { source: from, target: to, weight }]);
            addLog(`Added railroad between ${from} and ${to} with distance ${weight}.`);
        }
        e.target.reset();
    };
    
    const handleCalculatePath = () => {
        if (!sourceNode || !destNode) {
            addLog("Error: Please select both source and destination stations.");
            return;
        }
        stopSimulation();
        const path = dijkstra(sourceNode, destNode);
        if (path.length > 0) {
            setShortestPath(path);
            setTrainPosition(null); // Train is not positioned until simulation starts
            addLog(`Shortest path from ${sourceNode} to ${destNode}: ${path.join(' -> ')}`);
        } else {
            setShortestPath([]);
            addLog(`No path found from ${sourceNode} to ${destNode}.`);
        }
    };
    
    const startSimulation = () => {
        if (shortestPath.length > 0 && sourceNode && destNode) {
            setIsSimulating(true);
            setTrainPosition(sourceNode);
            addLog(`Starting journey at Station ${sourceNode}. Waiting for dispatch.`);
        } else {
            addLog("Cannot start: Calculate a path first.");
        }
    };

    const handleProceed = () => {
        if (!isSimulating || !trainPosition) return;

        const currentIndex = shortestPath.indexOf(trainPosition);
        if (currentIndex < shortestPath.length - 1) {
            const nextPos = shortestPath[currentIndex + 1];
            addLog(`Train proceeding from Station ${trainPosition} to ${nextPos}.`);
            setTrainPosition(nextPos);
            if(nextPos === destNode) {
                 addLog(`Train has arrived at destination: Station ${destNode}.`);
                 setIsSimulating(false); // End of journey
            }
        }
    };

    // --- Render Component ---
    return (
        <div className="bg-gray-800 text-gray-100 font-sans min-h-screen flex flex-col lg:flex-row">
            {/* Controls Panel */}
            <div className="w-full lg:w-96 p-4 bg-gray-900 shadow-lg flex flex-col space-y-4 overflow-y-auto">
                <h1 className="text-2xl font-bold text-emerald-400">Dynamic Train Routing</h1>
                
                <div className="bg-gray-800 p-3 rounded-lg">
                    <label htmlFor="numStations" className="block text-sm font-medium text-gray-300 mb-2">Number of Stations</label>
                    <input type="number" id="numStations" min="2" max="15" value={numStations} onChange={(e) => { const value = e.target.value; setNumStations(value === '' ? '' : parseInt(value, 10)); }} onBlur={(e) => { let val = parseInt(e.target.value, 10); if (isNaN(val) || val < 2) val = 2; if (val > 15) val = 15; setNumStations(val); }} className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-emerald-500 focus-border-emerald-500 text-center font-bold" />
                </div>
                
                <form onSubmit={handleAddEdge} className="bg-gray-800 p-3 rounded-lg space-y-3">
                    <h2 className="font-semibold text-gray-200">Add/Update Railroad</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="from" className="block text-xs text-gray-400">From</label>
                            <select id="from" className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500">{nodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select>
                        </div>
                        <div>
                            <label htmlFor="to" className="block text-xs text-gray-400">To</label>
                            <select id="to" className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500">{nodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="weight" className="block text-xs text-gray-400">Distance (Weight)</label>
                        <input type="number" id="weight" required min="1" className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-emerald-500 focus:border-emerald-500" placeholder="e.g., 10"/>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 rounded py-2 text-sm font-semibold transition-colors">Add/Update</button>
                </form>

                <div className="bg-gray-800 p-3 rounded-lg space-y-3">
                    <h2 className="font-semibold text-gray-200">Find Shortest Path</h2>
                     <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label htmlFor="source" className="block text-xs text-gray-400">Source</label>
                            <select id="source" value={sourceNode} onChange={e => setSourceNode(e.target.value)} className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-blue-500 focus:border-blue-500"><option value="">Select</option>{nodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select>
                         </div>
                         <div>
                            <label htmlFor="dest" className="block text-xs text-gray-400">Destination</label>
                            <select id="dest" value={destNode} onChange={e => setDestNode(e.target.value)} className="w-full bg-gray-700 rounded p-2 text-sm border border-gray-600 focus:ring-red-500 focus:border-red-500"><option value="">Select</option>{nodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}</select>
                         </div>
                     </div>
                     <button onClick={handleCalculatePath} className="w-full bg-blue-600 hover:bg-blue-700 rounded py-2 text-sm font-semibold transition-colors">Calculate Path</button>
                </div>
                
                <div className="bg-gray-800 p-3 rounded-lg space-y-3">
                    <h2 className="font-semibold text-gray-200">Simulation Control</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={startSimulation} disabled={isSimulating || shortestPath.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 rounded py-2 text-sm font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">Start Journey</button>
                        <button onClick={stopSimulation} disabled={!isSimulating && trainPosition === null} className="w-full bg-red-600 hover:bg-red-700 rounded py-2 text-sm font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">Stop</button>
                    </div>
                    <button 
                        onClick={handleProceed} 
                        disabled={!isSimulating || trainPosition === destNode} 
                        className="w-full bg-green-600 hover:bg-green-700 rounded py-2 text-sm font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed mt-2"
                    >
                        Proceed to Next Station
                    </button>
                </div>
                
                 <div className="flex-grow flex flex-col">
                    <h2 className="font-semibold text-gray-200 mb-2">Logs</h2>
                    <div className="bg-gray-900 p-2 rounded-lg flex-grow h-48 overflow-y-auto text-xs text-gray-400 font-mono space-y-1">
                        {logs.map((log, i) => <p key={i}>{log}</p>)}
                    </div>
                </div>
            </div>

            {/* Graph Display */}
            <div className="flex-grow p-4 min-h-[50vh] lg:min-h-0">
                <div className="w-full h-full bg-gray-900 rounded-lg shadow-inner overflow-hidden">
                    <svg ref={svgRef} className="w-full h-full"></svg>
                </div>
            </div>
        </div>
    );
}

