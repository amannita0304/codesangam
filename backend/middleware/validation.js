exports.validateComplaint = (req, res, next) => {
  const { type, description, location } = req.body;

  if (!type || !description || !location || !location.address) {
    return res.status(400).json({
      success: false,
      message: 'Please provide type, description, and location with address'
    });
  }

  next();
};