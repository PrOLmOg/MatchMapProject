const bcrypt = require('bcrypt');

const password = 'hashedpassword'; // Replace with your admin password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) throw err;
    console.log('Hashed Password:', hash);
});
