const mariadb = require('mariadb');
const urlObj = new URL("mysql://root:@localhost:3306/custom_cms");
const pool = mariadb.createPool({ 
  host: urlObj.hostname,
  port: urlObj.port ? parseInt(urlObj.port) : 3306,
  user: urlObj.username || 'root',
  password: urlObj.password || '',
  database: urlObj.pathname.substring(1)
});
pool.getConnection()
  .then(conn => {
    console.log("Connected!");
    conn.release();
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err);
    process.exit(1);
  });
