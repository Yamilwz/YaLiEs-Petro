require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`   YaLiEs Petrol Backend running on port ${PORT} `);
  console.log(`   Local URL: http://localhost:${PORT}           `);
  console.log(`==================================================`);
});
