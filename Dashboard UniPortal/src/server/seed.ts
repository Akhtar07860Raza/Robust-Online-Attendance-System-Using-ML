import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const students = [
  { name: 'Akhtar Raza', enrollment: '1001', email: 'akhtar087650raza@gmail.com' },
  { name: 'Amit', enrollment: '1002', email: 'amit1002@university.edu' },
  { name: 'Gulshan Baghel', enrollment: '1003', email: 'gulshanbaghel46@gmail.com' },
  { name: 'Nayan', enrollment: '1004', email: 'nayan1004@university.edu' },
  { name: 'Rakesh', enrollment: '1005', email: 'rakesh1005@university.edu' },
  { name: 'Ravi', enrollment: '1006', email: 'ravi1006@university.edu' },
  { name: 'Saurabh Raj', enrollment: '1007', email: 'aloksinhatyt@gmail.com' },
  { name: 'Suresh', enrollment: '1008', email: 'suresh1008@university.edu' },
  { name: 'Urkarsh', enrollment: '1009', email: 'urkarsh1009@university.edu' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Database Seeding ---');

    // 0. Drop existing tables for a clean slate to avoid ID mixups
    await client.query(`
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS timetable CASCADE;
      DROP TABLE IF EXISTS faculty CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS subjects CASCADE;
    `);

    // 1. Create Tables
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(20) CHECK (role IN ('student', 'faculty', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        enrollment VARCHAR(50) UNIQUE NOT NULL,
        branch VARCHAR(255) DEFAULT 'Computer Science and Engineering',
        semester INTEGER DEFAULT 7,
        status VARCHAR(20) DEFAULT 'Active'
      );

      CREATE TABLE IF NOT EXISTS faculty (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255) DEFAULT 'Computer Science',
        designation VARCHAR(255) DEFAULT 'Assistant Professor'
      );
    `);

    console.log('Tables verified/created.');

    // 2. Insert Students
    for (const s of students) {
      // Check if user exists
      const userRes = await client.query('SELECT id FROM users WHERE email = $1', [s.email]);
      let userId;

      if (userRes.rows.length === 0) {
        const newUser = await client.query(
          'INSERT INTO users (email, role, full_name) VALUES ($1, $2, $3) RETURNING id',
          [s.email, 'student', s.name]
        );
        userId = newUser.rows[0].id;
        console.log(`Created user for ${s.name}`);
      } else {
        userId = userRes.rows[0].id;
      }

      // Check if student exists
      const studentRes = await client.query('SELECT id FROM students WHERE enrollment = $1', [s.enrollment]);
      if (studentRes.rows.length === 0) {
        await client.query(
          'INSERT INTO students (user_id, name, enrollment) VALUES ($1, $2, $3)',
          [userId, s.name, s.enrollment]
        );
        console.log(`Associated ${s.name} as student.`);
      }
    }

    // 3. Insert specific Faculty
    const facultyMembers = [
      { name: 'Dharmendra Kumar', email: 'dharmendra@university.edu', dept: 'Computer Science', role: 'Assistant Professor' },
      { name: 'Akhtar Raza (Faculty)', email: 'akhtar07860raza@gmail.com', dept: 'IT & CSE', role: 'Head of Analytics' }
    ];

    for (const f of facultyMembers) {
      const facultyUserRes = await client.query('SELECT id FROM users WHERE email = $1', [f.email]);
      let facultyUserId;

      if (facultyUserRes.rows.length === 0) {
        const newFacultyUser = await client.query(
          'INSERT INTO users (email, role, full_name) VALUES ($1, $2, $3) RETURNING id',
          [f.email, 'faculty', f.name]
        );
        facultyUserId = newFacultyUser.rows[0].id;
      } else {
        facultyUserId = facultyUserRes.rows[0].id;
      }

      const facultyRes = await client.query('SELECT id FROM faculty WHERE user_id = $1', [facultyUserId]);
      if (facultyRes.rows.length === 0) {
        await client.query(
          'INSERT INTO faculty (user_id, name, department, designation) VALUES ($1, $2, $3, $4)',
          [facultyUserId, f.name, f.dept, f.role]
        );
        console.log(`Created faculty: ${f.name}`);
      }
    }

    console.log('--- Seeding Completed Successfully ---');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
