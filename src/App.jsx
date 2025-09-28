import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import RailwayMap from "./RailwayMap";


function App() {
  return (
    <div className="App">
      <h1>Train Traffic Visualization</h1>
      <RailwayMap />
    </div>
  );
}

export default App;
