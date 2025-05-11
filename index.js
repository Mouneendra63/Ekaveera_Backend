import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import userValid from './validators/user.js';
import reviewValid from './validators/review.js';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Get all user
app.get('/api/userDetails', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        prescription: true 
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user with validation
app.post('/api/userDetails', async (req, res) => {
  try {
    const valid = userValid.safeParse(req.body);
    if (!valid.success) {
      return res.status(400).json({ error: valid.error.errors });
    }

    const user = await prisma.user.create({ data: req.body });
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Send email with prescription
app.post('/api/sendEmail', async (req, res) => {
  try {
    const { id } = req.body;

    const patient = await prisma.user.findUnique({
      where: { id },
      include: { prescription: true } // ✅ CORRECT field name from schema
    });

    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (!patient.email) return res.status(400).json({ error: 'Patient email is missing' });
    if (!patient.prescription.length) {
      return res.status(400).json({ error: 'No prescriptions available to email' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      }
    });

    const formattedPrescriptions = patient.prescription.map(p => `
      <li><strong>${p.tablets}</strong>: ${p.dosage} for ${p.duration}</li>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL,
      to: patient.email,
      subject: 'Prescription Update',
      html: `
        <h2>Hello ${patient.name},</h2>
        <p>Here are your latest prescriptions:</p>
        <ul>${formattedPrescriptions}</ul>
        <p><i>Please follow the prescribed dosage and consult your doctor for any concerns.</i></p>
      `,
      text: `Hello ${patient.name},\n\nHere are your latest prescriptions:\n- ${patient.prescription.map(p => `${p.tablets}: ${p.dosage} for ${p.duration}`).join('\n- ')}\n\nPlease follow the prescribed dosage and consult your doctor for any concerns.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to: ${patient.email}`);
    res.status(200).json({ message: 'Email sent successfully' });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Update user with validation
app.put('/api/userDetails/:id', async (req, res) => {
  const { id } = req.params;
  const { newPrescription } = req.body;

  if (!Array.isArray(newPrescription)) {
    return res.status(400).json({ error: 'newPrescription must be an array' });
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        prescription: {
          create: newPrescription.map(p => ({
            tablets: p.tablets,
            dosage: p.dosage,
            duration: p.duration,
            date: p.date || new Date().toISOString()
          }))
        }
      },
      include: {
        prescription: true
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to add prescription' });
  }
});

// Mark as completed
app.put('/api/userDetails/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.update({
      where: { id },
      data: { isCompleted: true },
    });
    res.status(200).json({ message: 'Marked as completed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as completed' });
  }
});

// Delete user
app.delete('/api/userDetails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.delete('/api/userDetails/:userId/prescription/:prescriptionId', async (req, res) => {
  const { prescriptionId } = req.params;

  try {
    const deleted = await prisma.prescription.delete({
      where: { id: prescriptionId }
    });

    res.status(200).json({ message: 'Prescription deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

// DELETE NewPrescription
app.delete('/api/userDetails/:userId/newPrescription/:prescriptionId', async (req, res) => {
  const { prescriptionId } = req.params;

  try {
    const deleted = await prisma.newPrescription.delete({
      where: { id: prescriptionId }
    });

    res.status(200).json({ message: 'New prescription deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting newPrescription:', error);
    res.status(500).json({ error: 'Failed to delete new prescription' });
  }
});

// Submit review with validation
app.post('/api/reviews', async (req, res) => {
  try {
    const valid = reviewValid.safeParse(req.body);
    if (!valid.success) {
      return res.status(400).json({ error: valid.error.errors });
    }

    const { name, email, rating, comment } = req.body;
    await prisma.review.create({
      data: { name, email, rating, comment }
    });

    res.status(201).json({ message: 'Review submitted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get high-rated reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { rating: { gt: 3 } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Specific User
app.get('/api/userDetails/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        prescription: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Export data to Excel
app.get('/api/download-excel', async (req, res) => {
  try {
    const user = await prisma.user.findMany();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('user');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phno', width: 15 },
      { header: 'Age', key: 'age', width: 5 },
      { header: 'Sex', key: 'sex', width: 10 },
      { header: 'Medical Concern', key: 'medicalConcern', width: 30 },
      { header: 'Completed', key: 'isCompleted', width: 10 }
    ];

    user.forEach(user => worksheet.addRow({
      ...user,
      medicalConcern: user.medicalConcern.join(', ')
    }));

    const filePath = path.join('UserData.xlsx');
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, () => fs.unlinkSync(filePath));
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate Excel file' });
  }
});

console.log(process.env.EMAIL, process.env.PASSWORD);
app.listen(PORT, () => console.log(`Server running on Port`));