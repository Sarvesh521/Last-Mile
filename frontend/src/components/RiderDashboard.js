import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Alert } from '@mui/material';
import { riderApi, matchingApi } from '../services/api';

function RiderDashboard() {
  const [riderId, setRiderId] = useState('');
  const [metroStation, setMetroStation] = useState('');
  const [destination, setDestination] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [message, setMessage] = useState('');
  const [rideRequestId, setRideRequestId] = useState('');

  const handleRegisterRideRequest = async () => {
    try {
      const response = await riderApi.registerRideRequest({
        riderId,
        metroStation,
        destination,
        arrivalTime: new Date(arrivalTime).getTime(),
      });
      
      if (response.data.success) {
        setRideRequestId(response.data.rideRequestId);
        setMessage(`Ride request registered! ID: ${response.data.rideRequestId}`);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error registering ride request: ' + error.message);
    }
  };

  const handleMatch = async () => {
    if (!rideRequestId) {
      setMessage('Please register a ride request first');
      return;
    }
    
    try {
      const response = await matchingApi.matchRiderWithDriver({
        rideRequestId,
        riderId,
        metroStation,
        destination,
        arrivalTime: new Date(arrivalTime).getTime(),
      });
      
      if (response.data.success) {
        setMessage(`Matched with driver! Driver ID: ${response.data.driverId}, Match ID: ${response.data.matchId}`);
      } else {
        setMessage(response.data.message);
      }
    } catch (error) {
      setMessage('Error matching: ' + error.message);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Rider Dashboard
        </Typography>
        
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Request a Ride
          </Typography>
          
          <TextField
            fullWidth
            label="Rider ID"
            value={riderId}
            onChange={(e) => setRiderId(e.target.value)}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Metro Station"
            value={metroStation}
            onChange={(e) => setMetroStation(e.target.value)}
            margin="normal"
          />
          
          <TextField
            fullWidth
            label="Destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            margin="normal"
          />
          
          <TextField
            fullWidth
            type="datetime-local"
            label="Arrival Time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          
          <Button
            variant="contained"
            onClick={handleRegisterRideRequest}
            sx={{ mt: 2, mr: 2 }}
          >
            Register Ride Request
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            onClick={handleMatch}
            sx={{ mt: 2 }}
          >
            Find Match
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

export default RiderDashboard;

