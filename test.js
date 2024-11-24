const bcrypt = require('bcrypt');

// Hash a known password
const plainPassword = 'f1';
bcrypt.hash(plainPassword, 10).then(newHash => {
    console.log('Generated hash:', newHash);

    // Compare the newly hashed password with the stored hash
    bcrypt.compare(plainPassword, storedHash)
        .then(isMatch => {
            console.log('Password match:', isMatch);
        })
        .catch(err => console.error('Error comparing password:', err));
});
