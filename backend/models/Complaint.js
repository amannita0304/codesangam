const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    required: true
  },
  citizen: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Please add complaint type'],
    enum: ['Road Damage', 'Water Leakage', 'Garbage', 'Electricity', 'Sewage', 'Other']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  location: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  photo: {
    type: String, // URL to uploaded photo
    default: null
  },
  status: {
    type: String,
    enum: ['OPEN', 'IN PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    default: null
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  slaDeadline: {
    type: Date
  },
  notes: [{
    staff: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolutionPhoto: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

// Generate complaint ID before saving
complaintSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments();
    this.complaintId = `#${100 + count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);