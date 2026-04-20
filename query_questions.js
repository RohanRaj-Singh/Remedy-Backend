// Script to query all questions from MongoDB
const mongoose = require('mongoose');

const DB_URL = 'mongodb://oqep_app:Oqep%402026@127.0.0.1:27017/oqep';

mongoose.connect(DB_URL).then(async () => {
  const db = mongoose.connection.db;
  
  // Get all non-follow-up questions
  const mainQs = await db.collection('questions')
    .find({ isDeleted: false, isFollowUp: false })
    .sort({ id: 1 })
    .toArray();
  
  console.log('=== MAIN QUESTIONS ===');
  mainQs.forEach(q => {
    console.log(JSON.stringify({
      _id: q._id.toString(),
      id: q.id,
      domain: q.dashboardDomain,
      weight: q.weight,
      isInverted: q.isInverted
    }));
  });
  console.log('TOTAL MAIN:', mainQs.length);
  
  // Get follow-up questions
  const followUps = await db.collection('questions')
    .find({ isDeleted: false, isFollowUp: true })
    .toArray();
  
  console.log('\n=== FOLLOW-UP QUESTIONS ===');
  followUps.forEach(q => {
    console.log(JSON.stringify({
      _id: q._id.toString(),
      id: q.id,
      domain: q.dashboardDomain,
      weight: q.weight
    }));
  });
  console.log('TOTAL FOLLOW-UPS:', followUps.length);
  
  // Get organization
  const org = await db.collection('organizations').findOne({});
  console.log('\n=== ORGANIZATION ===');
  console.log(JSON.stringify({ _id: org._id.toString(), name: org.organizationName }));
  
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
