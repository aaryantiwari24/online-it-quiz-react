// backend/scripts/seed.js
//
// Standalone seeding script. Run from inside backend/ with:
//   node scripts/seed.js
// Requires MONGO_URI to be set in backend/.env (created in Phase 0).
//
// Safe to re-run: it clears all 7 collections before inserting fresh data.
//
// FLAGGED UPDATE (Phase 2): these passwords used to be stored as plain
// text, on the assumption that "real bcrypt hashing is wired up in
// Phase 2's authController, not here." That part is now true — but
// authController's login calls bcrypt.compare(plainPassword, storedHash),
// which only ever matches against a real bcrypt hash, never plain text.
// Left as plain text, none of these seeded accounts could actually log in
// through POST /api/auth/login. So this script now hashes them the same
// way registration does. The plaintext values are still shown below and
// in the console output — that's what you type into the login form or a
// Postman body, not what ends up stored in MongoDB.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const FAQ = require('../models/FAQ');
// FLAGGED ADDITION — security fix (see
// SECURITY_FIX_SERVER_SIDE_QUIZ_ATTEMPT.md): a 7th collection, added the
// same way Result/Certificate were in their own phases — modeled and
// wiped on re-seed, but never seeded with data (see the note near the
// bottom of this script for why).
const QuizAttempt = require('../models/QuizAttempt');

async function seed() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not set — check backend/.env');
  }

  // Reuses the same connectDB() server.js calls, so seeding always talks
  // to the same database the API would. connectDB() catches its own
  // errors and logs them (see config/db.js) rather than throwing, so we
  // check readyState afterward to fail loudly here — a seed script with
  // no real connection should stop, not silently insert nothing.
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      'Could not connect to MongoDB (see the connection error logged above). Check MONGO_URI in backend/.env.'
    );
  }
  console.log(`Connected to MongoDB database: "${mongoose.connection.name}"`);

  // Wipe existing data first so this script is safe to re-run.
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Question.deleteMany({}),
    Result.deleteMany({}),
    Certificate.deleteMany({}),
    FAQ.deleteMany({}),
    QuizAttempt.deleteMany({}),
  ]);
  console.log('Cleared existing documents from all 7 collections.');

  // ---------------- Users ----------------
  // Hashed with the same salt rounds as a real registration (see
  // backend/controllers/authController.js), so these seeded accounts
  // work through POST /api/auth/login, not just for reading back in
  // Compass/mongosh.
  const SALT_ROUNDS = 10;
  const hash = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

  const [admin, supplier, customer] = await User.create([
    {
      name: 'Admin User',
      email: 'admin@itquiz.test',
      password: await hash('admin123'),
      role: 'admin',
    },
    {
      name: 'Sample Supplier',
      email: 'supplier@itquiz.test',
      password: await hash('supplier123'),
      role: 'supplier',
      phone: '9998887777',
    },
    {
      name: 'Sample Student',
      email: 'customer@itquiz.test',
      password: await hash('customer123'),
      role: 'customer',
      phone: '9998886666',
    },
  ]);
  console.log(
    `Inserted 3 users — admin: ${admin.email}, supplier: ${supplier.email}, customer: ${customer.email}`
  );

  // ---------------- Categories ----------------
  const [php, javascript] = await Category.create([
    {
      category_name: 'PHP',
      description:
        'Core PHP syntax, functions, arrays, and server-side scripting basics.',
    },
    {
      category_name: 'JavaScript',
      description:
        'Core JavaScript syntax, DOM basics, and everyday language features.',
    },
  ]);
  console.log(`Inserted 2 categories — ${php.category_name}, ${javascript.category_name}`);

  // ---------------- Questions ----------------
  // PHP gets 10 Easy + 2 more, so the Easy tier alone already clears the
  // "10 random questions per category+difficulty" bar the quiz screen needs.
  const phpQuestions = [
    { question: 'Which symbol is used to declare a variable in PHP?', option_a: '@', option_b: '$', option_c: '#', option_d: '&', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which of these correctly opens a PHP code block?', option_a: '<php>', option_b: '<?php', option_c: '<script php>', option_d: '{php}', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which construct outputs text to the browser in PHP?', option_a: 'print_r()', option_b: 'echo', option_c: 'console.log()', option_d: 'printf() only', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which superglobal holds data submitted via an HTML form using the POST method?', option_a: '$_GET', option_b: '$_REQUEST', option_c: '$_POST', option_d: '$_FORM', correct_answer: 'C', difficulty: 'Easy' },
    { question: 'How do you write a single-line comment in PHP?', option_a: '<!-- comment -->', option_b: '// comment', option_c: '/* comment', option_d: '#--comment', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which function checks whether a variable is considered empty in PHP?', option_a: 'isset()', option_b: 'is_null()', option_c: 'empty()', option_d: 'unset()', correct_answer: 'C', difficulty: 'Easy' },
    { question: 'What does the "==" operator compare in PHP?', option_a: 'Type only', option_b: 'Value only (loose comparison)', option_c: 'Value and type', option_d: 'Memory reference', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which array type uses named keys instead of numeric indexes?', option_a: 'Indexed array', option_b: 'Associative array', option_c: 'Static array', option_d: 'Constant array', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which function returns the number of elements in a PHP array?', option_a: 'length()', option_b: 'size()', option_c: 'count()', option_d: 'sizeof_array()', correct_answer: 'C', difficulty: 'Easy' },
    { question: 'Every PHP statement must end with which character?', option_a: ':', option_b: ';', option_c: '.', option_d: ',', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which function starts a connection to a MySQL database using the MySQLi extension?', option_a: 'mysqli_connect()', option_b: 'mysql_open()', option_c: 'db_connect()', option_d: 'new PDOConnect()', correct_answer: 'A', difficulty: 'Medium' },
    { question: 'Which PHP construct lets you catch and handle a runtime error gracefully?', option_a: 'if / else', option_b: 'try / catch', option_c: 'switch / case', option_d: 'foreach', correct_answer: 'B', difficulty: 'Hard' },
  ];

  const jsQuestions = [
    { question: 'Which keyword declares a block-scoped variable in modern JavaScript?', option_a: 'var', option_b: 'let', option_c: 'define', option_d: 'dim', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which method converts a JSON string into a JavaScript object?', option_a: 'JSON.stringify()', option_b: 'JSON.parse()', option_c: 'Object.toJSON()', option_d: 'parseJSON()', correct_answer: 'B', difficulty: 'Easy' },
    { question: 'Which array method builds a new array by transforming every element?', option_a: 'forEach()', option_b: 'filter()', option_c: 'map()', option_d: 'reduce()', correct_answer: 'C', difficulty: 'Medium' },
    { question: 'In React, which Hook lets a function component hold local state?', option_a: 'useEffect', option_b: 'useRef', option_c: 'useState', option_d: 'useContext', correct_answer: 'C', difficulty: 'Medium' },
    { question: 'Inside a regular function called as obj.method(), what does "this" refer to?', option_a: 'The global object always', option_b: 'The function itself', option_c: 'The object the method was called on', option_d: 'undefined always', correct_answer: 'C', difficulty: 'Hard' },
  ];

  const phpDocs = await Question.insertMany(
    phpQuestions.map((q) => ({ ...q, category: php._id, createdBy: supplier._id }))
  );
  const jsDocs = await Question.insertMany(
    jsQuestions.map((q) => ({ ...q, category: javascript._id, createdBy: supplier._id }))
  );
  console.log(
    `Inserted ${phpDocs.length} PHP questions (10 Easy / 1 Medium / 1 Hard) and ${jsDocs.length} JavaScript questions.`
  );

  // ---------------- FAQs ----------------
  const faqs = await FAQ.insertMany([
    {
      question: 'How many questions are in each quiz attempt?',
      answer: '10 questions, randomly picked from the chosen category and difficulty tier.',
    },
    {
      question: 'What score do I need to pass?',
      answer: 'A score of 60% or higher on a quiz attempt counts as a pass.',
    },
    {
      question: 'How do I get my certificate?',
      answer: 'Certificates are generated the first time you view a passed result, from your Evaluation History.',
    },
  ]);
  console.log(`Inserted ${faqs.length} FAQs.`);

  // Result and Certificate are intentionally left empty — both represent a
  // *completed quiz attempt*, which doesn't exist until Phase 4/5's APIs
  // are live. The collections/models exist; there's just no data yet.
  //
  // QuizAttempt (added by the "no server-side quiz attempt" security fix)
  // is left empty for the same reason, one level earlier: it represents
  // an *in-progress or just-finished* quiz session, which only ever comes
  // into being through POST /api/quiz-attempts while someone is actually
  // taking a quiz — there's no meaningful "starter" attempt to seed ahead
  // of that, any more than there was a meaningful starter Result before a
  // real quiz had been submitted.

  const totalDocs = 3 + 2 + phpDocs.length + jsDocs.length + faqs.length;
  console.log(`\nSeed complete — ${totalDocs} documents inserted (Users, Categories, Questions, FAQs).`);
  console.log('Result, Certificate, and QuizAttempt collections are intentionally left empty.');
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
