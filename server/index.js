const express = require('express');
const app = express();
const port = 3000;

// Serve i file statici da /public
app.use(express.static('public'));

// Avvia il server
app.listen(port, () => {
  console.log(`Server attivo su http://localhost:${port}`);
});