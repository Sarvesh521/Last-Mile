import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Grid } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import PersonIcon from '@mui/icons-material/Person';

function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          LastMile
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Metro Station Drop Service
        </Typography>
        
        <Grid container spacing={4} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, border: '1px solid #ddd', borderRadius: 2 }}>
              <DirectionsCarIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Driver
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Register your route and help commuters reach their destinations
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/driver')}
                sx={{ mt: 2 }}
              >
                Go to Driver Dashboard
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, border: '1px solid #ddd', borderRadius: 2 }}>
              <PersonIcon sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Rider
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Request a ride from metro station to your destination
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={() => navigate('/rider')}
                sx={{ mt: 2 }}
              >
                Go to Rider Dashboard
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4 }}>
          <Button onClick={() => navigate('/login')}>Login</Button>
          <Button onClick={() => navigate('/register')}>Register</Button>
        </Box>
      </Box>
    </Container>
  );
}

export default Home;

