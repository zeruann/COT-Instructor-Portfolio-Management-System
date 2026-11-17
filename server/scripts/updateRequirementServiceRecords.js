// server/scripts/updateRequirementServiceRecords.js
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.collection('requirements').updateOne(
      { key: 'FAC_C_SERVICE_RECORD' },
      {
        $set: {
          multiple: true,
          metaFields: [
            {
              name: 'name',
              label: 'Title / Service Name',
              type: 'text',
              required: true,
            },
            {
              name: 'date',
              label: 'Date',
              type: 'date',
              required: true,
            },
          ],
        },
      }
    );

    console.log('Update result:', result);
  } catch (err) {
    console.error('Error updating requirement:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

run();
