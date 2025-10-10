const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['citizen', 'staff', 'admin'],
    default: 'citizen'
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    locality: {
      type: String,
      required: function() { 
        return this.role !== 'citizen'; // Required for staff/admin only
      }
    },
    ward: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  
  // === ADMIN/STAFF APPROVAL SYSTEM ===
  isApproved: {
    type: Boolean,
    default: function() { 
      return this.role === 'citizen'; // Citizens auto-approved
    }
  },
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
  // === STAFF SPECIALIZATION ===
  department: {
    type: String,
    enum: ['Roads', 'Water', 'Garbage', 'Electricity', 'General'],
    required: function() { 
      return this.role === 'staff'; // Required for staff only
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);