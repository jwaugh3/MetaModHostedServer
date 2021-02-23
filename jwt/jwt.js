// Verify Token
const verifyToken = (req, res, next) => {
	// Get auth header value
	const tokenProvided = req.params.token;
    // Check if bearer is undefined

	if(typeof tokenProvided !== 'undefined') {
	  // Set the token
	  req.token = tokenProvided;
	  // Next middleware
	  next();
	} else {
	  // Forbidden
	  res.sendStatus(403);
	}
}

module.exports = verifyToken