// Import the express package for handling HTTP requests
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('src/public'));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});