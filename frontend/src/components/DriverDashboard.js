import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Alert } from '@mui/material';
import { driverApi, stationApi } from '../services/api';

function DriverDashboard() {
  const [driverId, setDriverId] = useState('');
  const [originStation, setOriginStation] = useState('');
  const [destination, setDestination] = useState('');
  const [availableSeats, setAvailableSeats] = useState(4);
  const [message, setMessage] = useState('');
  const [stations, setStations] = useState([]);

  const handleGetStations = async () => {
    try {
      const response = await stationApi.getStationsAlongRoute(originStation, destination);
      if (response.data.success) {
        setStations(response.data.stations);
        setMessage(`Found ${response.data.stations.length} stations along route`);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error fetching stations: ' + error.message);
    }
  };

  const handleRegisterRoute = async () => {
    try {
      const metroStations = stations.map(s => s.stationId);
      const response = await driverApi.registerRoute({
        driverId,
        originStation,
        destination,
        availableSeats,
        metroStations,
      });
      
      if (response.data.success) {
        setMessage(`Route registered successfully! Route ID: ${response.data.routeId}`);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error registering route: ' + error.message);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Driver Dashboard
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Register Route
          </Typography>
          
          <TextField
            fullWidth
            label="Driver ID"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Origin Station"
            value={originStation}
            onChange={(e) => setOriginStation(e.target.value)}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            margin="normal"
            helperText="Enter destination (e.g., North, South, East, West, Central, Downtown, Airport, Mall)"
          />
          
          <TextField
            fullWidth
            type="number"
            label="Available Seats"
            value={availableSeats}
            onChange={(e) => setAvailableSeats(parseInt(e.target.value))}
            margin="normal"
          />
          
          <Button
            variant="outlined"
            onClick={handleGetStations}
            sx={{ mt: 2, mr: 2 }}
          >
            Get Stations Along Route
          </Button>
          
          {stations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Metro Stations:</Typography>
              {stations.map((station) => (
                <Typography key={station.stationId} variant="body2">
                  - {station.name} ({station.stationId}) - {station.line} Line
                </Typography>
              ))}
            </Box>
          )}
          
          <Button
            variant="contained"
            onClick={handleRegisterRoute}
            sx={{ mt: 2 }}
            fullWidth
          >
            Register Route
          </Button>
          
          {message && (
            <Alert severity={message.includes('Error') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default DriverDashboard;

