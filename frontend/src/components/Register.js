import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, MenuItem } from '@mui/material';
import { userApi } from '../services/api';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('RIDER');  // frontend state variable

  const handleRegister = async () => {
    try {
      // 🟢 MUST send user_type as snake_case to match proto
      const response = await userApi.register({
        email,
        password,
        name,
        user_type: userType,
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userId', response.data.userId);
        window.location.href = '/';
      }
    } catch (error) {
      alert('Registration failed: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Register
          </Typography>

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
          />

          <TextField
            fullWidth
            select
            label="User Type"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            margin="normal"
          >
            <MenuItem value="RIDER">Rider</MenuItem>
            <MenuItem value="DRIVER">Driver</MenuItem>
          </TextField>

          <Button
            variant="contained"
            fullWidth
            onClick={handleRegister}
            sx={{ mt: 2 }}
          >
            Register
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;
