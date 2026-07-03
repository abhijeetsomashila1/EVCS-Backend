const pool = require('./database');
pool.query("UPDATE users SET phone='8333893337' WHERE email='evcharger@scrc.com'")
  .then(() => {
    console.log('Successfully updated admin phone number!');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
