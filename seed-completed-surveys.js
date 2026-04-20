// seed-completed-surveys.js
// Seeds 6 completed survey responses with varied demographics and realistic answers
// Run from: /var/www/remedygcc/oqep/backend/
// Usage: node seed-completed-surveys.js

const mongoose = require('mongoose');

const DB_URL = 'mongodb://oqep_app:Oqep%402026@127.0.0.1:27017/oqep';

const ORG_ID = '6902bda0c0f78f02d2067668';

const DASHBOARD_DOMAINS = [
  'Clinical Risk Index',
  'Psychological Safety Index',
  'Workload & Efficiency',
  'Leadership & Alignment',
  'Satisfaction & Engagement',
];

// Main question IDs by domain
const MAIN_QUESTIONS = {
  'Satisfaction & Engagement': [
    '69dbf593c6dd1b57b78e7dc8', // Q1  w2
    '69dbf593c6dd1b57b78e7dca', // Q3  w3
    '69dbf593c6dd1b57b78e7dcb', // Q4  w3
    '69dbf593c6dd1b57b78e7dcf', // Q8  w3
    '69dbf593c6dd1b57b78e7dd1', // Q10 w3
    '69dbf593c6dd1b57b78e7dd2', // Q11 w2
    '69dbf593c6dd1b57b78e7dd3', // Q12 w3
    '69dbf593c6dd1b57b78e7dd4', // Q13 w4
    '69dbf593c6dd1b57b78e7de0', // Q25 w5
  ],
  'Clinical Risk Index': [
    '69dbf593c6dd1b57b78e7dc9', // Q2  w4
    '69dbf593c6dd1b57b78e7ddb', // Q20 w15
    '69dbf593c6dd1b57b78e7ddc', // Q21 w15
    '69dbf593c6dd1b57b78e7ddd', // Q22 w5
    '69dbf593c6dd1b57b78e7dde', // Q23 w5
    '69dbf593c6dd1b57b78e7ddf', // Q24 w5
  ],
  'Psychological Safety Index': [
    '69dbf593c6dd1b57b78e7dd5', // Q14 w4
    '69dbf593c6dd1b57b78e7dd6', // Q15 w5
    '69dbf593c6dd1b57b78e7dd7', // Q16 w4
    '69dbf593c6dd1b57b78e7dd8', // Q17 w4
    '69dbf593c6dd1b57b78e7dd9', // Q18 w5
    '69dbf593c6dd1b57b78e7dda', // Q19 w5
  ],
  'Workload & Efficiency': [
    '69dbf593c6dd1b57b78e7dcc', // Q5 w3
    '69dbf593c6dd1b57b78e7dcd', // Q6 w4
    '69dbf593c6dd1b57b78e7dce', // Q7 w5
  ],
  'Leadership & Alignment': [
    '69dbf593c6dd1b57b78e7dd0', // Q9 w4
  ],
};

// Follow-up question IDs by domain
const FOLLOWUP_QUESTIONS = {
  'Clinical Risk Index': [
    '69dbf593c6dd1b57b78e7de1', // Q26 w10
    '69dbf593c6dd1b57b78e7de2', // Q27 w10
    '69dbf593c6dd1b57b78e7de3', // Q28 w10
    '69dbf593c6dd1b57b78e7de4', // Q29 w5
  ],
  'Psychological Safety Index': [
    '69dbf593c6dd1b57b78e7de7', // Q32 w5
    '69dbf593c6dd1b57b78e7de8', // Q33 w3
  ],
  'Satisfaction & Engagement': [
    '69dbf593c6dd1b57b78e7de5', // Q30 w5
  ],
  'Workload & Efficiency': [
    '69dbf593c6dd1b57b78e7de6', // Q31 w5
  ],
};

const ANSWER_INDEX_SCORES = [-2, -1, 1, 2];

// 6 varied employee profiles
const EMPLOYEES = [
  { stream: 'Commercial', function: 'Business_Development', department: 'Business_Development', gender: 'male',   age: '25-34', seniorityLevel: 'senior',   location: 'headoffice' },
  { stream: 'Commercial', function: 'Business_Development', department: 'Business_Development', gender: 'female', age: '35-44', seniorityLevel: 'manager',  location: 'headoffice' },
  { stream: 'Commercial', function: 'Commercial',           department: 'Commercial',           gender: 'male',   age: '45-54', seniorityLevel: 'employee', location: 'headoffice' },
  { stream: 'Commercial', function: 'Business_Development', department: 'Business_Development', gender: 'female', age: '25-34', seniorityLevel: 'employee', location: 'headoffice' },
  { stream: 'Commercial', function: 'Commercial',           department: 'Commercial',           gender: 'male',   age: '18-24', seniorityLevel: 'employee', location: 'headoffice' },
  { stream: 'Commercial', function: 'Business_Development', department: 'Business_Development', gender: 'female', age: '35-44', seniorityLevel: 'senior',   location: 'headoffice' },
];

// Answer patterns per employee (biased distributions to create realistic risk profiles)
// answerIndex: 0=strongly disagree(-2), 1=disagree(-1), 2=agree(1), 3=strongly agree(2)
const ANSWER_PATTERNS = [
  // Employee 1: Mostly positive (low risk)
  [2, 3, 2, 3, 2, 2, 3, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 3, 2, 3, 2, 2, 3, 2, 3],
  // Employee 2: Mixed — some risky answers in Clinical domain
  [2, 0, 3, 2, 1, 2, 3, 2, 2, 3, 0, 1, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2, 2, 3, 2],
  // Employee 3: Moderate risk across multiple domains
  [1, 0, 2, 1, 2, 3, 1, 2, 0, 2, 1, 0, 3, 2, 1, 2, 3, 1, 2, 3, 2, 1, 0, 2, 3],
  // Employee 4: Mostly positive with a few concerns
  [3, 2, 3, 2, 3, 2, 2, 3, 3, 2, 3, 2, 3, 2, 3, 2, 3, 3, 2, 1, 3, 2, 3, 2, 3],
  // Employee 5: Higher risk in Psych Safety and Satisfaction
  [0, 2, 1, 0, 3, 2, 0, 1, 2, 1, 3, 2, 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 1],
  // Employee 6: Balanced — medium risk
  [2, 1, 3, 2, 1, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2, 1, 3, 2, 1, 3, 2],
];

// Follow-up answer patterns (for employees whose domains trigger follow-ups)
const FOLLOWUP_PATTERN = [2, 1, 3, 2, 1, 3, 2, 1];

function buildSurveyResponse(employeeIndex) {
  const emp = EMPLOYEES[employeeIndex];
  const answers = ANSWER_PATTERNS[employeeIndex];
  
  // Build all main question IDs in order
  const allMainQuestionIds = [];
  for (const domain of DASHBOARD_DOMAINS) {
    allMainQuestionIds.push(...(MAIN_QUESTIONS[domain] || []));
  }
  
  // Build responses for main questions
  const responses = [];
  const domainRiskCounts = {};
  DASHBOARD_DOMAINS.forEach(d => domainRiskCounts[d] = 0);
  
  let highRiskCount = 0;
  
  // Map question ID to domain
  const questionDomainMap = {};
  for (const [domain, qIds] of Object.entries(MAIN_QUESTIONS)) {
    for (const qId of qIds) {
      questionDomainMap[qId] = domain;
    }
  }
  
  for (let i = 0; i < allMainQuestionIds.length; i++) {
    const qId = allMainQuestionIds[i];
    const answerIndex = answers[i % answers.length];
    const score = ANSWER_INDEX_SCORES[answerIndex];
    
    responses.push({
      question: new mongoose.Types.ObjectId(qId),
      answerIndex,
      score,
    });
    
    const domain = questionDomainMap[qId];
    if (answerIndex === 0 || answerIndex === 1) {
      domainRiskCounts[domain] = (domainRiskCounts[domain] || 0) + 1;
      highRiskCount++;
    }
  }
  
  // Determine which domains need follow-ups (riskCount >= 2)
  const riskyDomains = Object.entries(domainRiskCounts)
    .filter(([_, count]) => count >= 2)
    .map(([domain]) => domain);
  
  const followUpQuestionIds = [];
  let fuIndex = 0;
  
  for (const domain of riskyDomains) {
    const fuQs = FOLLOWUP_QUESTIONS[domain] || [];
    for (const qId of fuQs) {
      followUpQuestionIds.push(qId);
      const answerIndex = FOLLOWUP_PATTERN[fuIndex % FOLLOWUP_PATTERN.length];
      const score = ANSWER_INDEX_SCORES[answerIndex];
      
      responses.push({
        question: new mongoose.Types.ObjectId(qId),
        answerIndex,
        score,
      });
      fuIndex++;
    }
  }
  
  const domainRisks = DASHBOARD_DOMAINS.map(domain => ({
    domain,
    riskCount: domainRiskCounts[domain] || 0,
  }));
  
  // Create the completed survey response document
  const now = new Date();
  // Stagger creation times over the past few days
  const createdAt = new Date(now.getTime() - (6 - employeeIndex) * 4 * 60 * 60 * 1000);
  const completedAt = new Date(createdAt.getTime() + 15 * 60 * 1000); // 15 min to complete
  
  return {
    organizationId: new mongoose.Types.ObjectId(ORG_ID),
    user: {
      organizationId: new mongoose.Types.ObjectId(ORG_ID),
      ...emp,
    },
    questions: allMainQuestionIds.map(id => new mongoose.Types.ObjectId(id)),
    followUpQuestions: followUpQuestionIds.map(id => new mongoose.Types.ObjectId(id)),
    responses,
    domainRisks,
    highRiskCount,
    status: 'completed',
    completedAt,
    createdAt,
    updatedAt: completedAt,
  };
}

async function main() {
  await mongoose.connect(DB_URL);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const collection = db.collection('surveyresponses');
  
  // First, remove the 4 empty in-progress surveys
  const deleteResult = await collection.deleteMany({ status: 'in-progress', responses: { $size: 0 } });
  console.log(`Deleted ${deleteResult.deletedCount} empty in-progress surveys`);
  
  // Delete any in-progress with no responses field
  const deleteResult2 = await collection.deleteMany({ status: 'in-progress', responses: { $exists: false } });
  console.log(`Deleted ${deleteResult2.deletedCount} in-progress surveys with no responses field`);
  
  // Also delete surveys that have empty responses (checking differently)
  const deleteResult3 = await collection.deleteMany({ 
    status: 'in-progress', 
    $or: [
      { responses: { $size: 0 } },
      { responses: { $exists: false } },
      { responses: null }
    ]
  });
  console.log(`Deleted ${deleteResult3.deletedCount} more empty surveys`);
  
  // Build and insert 6 completed survey responses
  const docs = [];
  for (let i = 0; i < 6; i++) {
    const doc = buildSurveyResponse(i);
    docs.push(doc);
    console.log(`Built survey ${i+1}: ${doc.user.gender} ${doc.user.age} ${doc.user.seniorityLevel} - ${doc.responses.length} answers, highRisk: ${doc.highRiskCount}, risky domains: ${doc.domainRisks.filter(d => d.riskCount >= 2).map(d => d.domain).join(', ') || 'none'}`);
  }
  
  const insertResult = await collection.insertMany(docs);
  console.log(`\nInserted ${insertResult.insertedCount} completed survey responses`);
  
  // Verify
  const totalCompleted = await collection.countDocuments({ status: 'completed' });
  const totalAll = await collection.countDocuments({});
  console.log(`\nVerification: ${totalCompleted} completed, ${totalAll} total surveys`);
  
  await mongoose.disconnect();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
