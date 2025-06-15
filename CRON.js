const cron = require('node-cron');
const axios = require('axios');

// CRON job - Every day at 12:00 PM
cron.schedule('0 12 * * *', async () => {
  try {
    console.log('Running daily API fetch at 12:00 PM');

    const response = await axios.get('https://ekaveera-backend.onrender.com/api/userDetails');
    const data = response.data;

    // Process or store the data as needed
    console.log('API data retrieved:', data);
    
    // You can also store to DB, trigger notifications, etc.

  } catch (error) {
    console.error('Failed to retrieve API data:', error.message);
  }
});
