const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    unique: true,
    
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
    },
    locality: {
      type: String,
      required: true
    },
    ward: String
  },
  photo: {
    type: String,
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
  
  // === SLA TRACKING FIELDS ===
  slaDeadline: {
    type: Date,
    
  },
  isOverdue: {
    type: Boolean,
    default: false
  },
  escalationLevel: {
    type: Number,
    default: 0,
    enum: [0, 1, 2]
  },
  timeToAssign: {
    type: Number
  },
  timeToResolve: {
    type: Number
  },
  // ===========================

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

// ========== MIDDLEWARE - MUST BE BEFORE EXPORT ==========

// 1. Generate complaint ID FIRST - FIXED VERSION
complaintSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Use the model constructor to avoid timing issues
      const ComplaintModel = mongoose.model('Complaint');
      const count = await ComplaintModel.countDocuments();
      this.complaintId = `COMP${1000 + count + 1}`;
      console.log(`✅ Generated complaint ID: ${this.complaintId}`);
    } catch (error) {
      console.error('Error generating complaint ID:', error);
      // Fallback if count fails
      this.complaintId = `COMP${Date.now()}`;
      console.log(`✅ Generated fallback complaint ID: ${this.complaintId}`);
    }
  }
  next();
});

// 2. Auto-set priority based on complaint type - FIXED VERSION
complaintSchema.pre('save', function(next) {
  if (this.isNew) {
    const typePriority = {
      'Water Leakage': 'HIGH',
      'Electricity': 'HIGH', 
      'Sewage': 'HIGH',
      'Road Damage': 'MEDIUM',
      'Garbage': 'MEDIUM',
      'Other': 'MEDIUM'
    };
    
    this.priority = typePriority[this.type] || 'MEDIUM';
    console.log(`✅ Auto-set priority for ${this.type} to ${this.priority}`);
  }
  next();
});

// 3. Auto-set SLA deadline based on priority (RUNS LAST) - FIXED VERSION
complaintSchema.pre('save', function(next) {
  if (this.isNew) {
    const slaDays = {
      'URGENT': 1,
      'HIGH': 3,
      'MEDIUM': 7,
      'LOW': 14
    };
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (slaDays[this.priority] || 7));
    this.slaDeadline = deadline;
    
    console.log(`✅ Auto-set SLA deadline: ${this.priority} priority = ${slaDays[this.priority]} days`);
  }
  next();
});

// 4. Update updatedAt timestamp on save
complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 5. Update updatedAt timestamp on findOneAndUpdate
complaintSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

// ========== EXPORT MODEL ==========
module.exports = mongoose.model('Complaint', complaintSchema);