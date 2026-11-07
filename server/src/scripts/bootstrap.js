// Explicit CLI only. Never invoked by installation, application startup or tests.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User} from '../models/index.js';
import {z} from 'zod';

const config = z.object({
  MONGODB_URI: z.string().min(1),
  BOOTSTRAP_ROLE: z.enum(['admin', 'president']),
  BOOTSTRAP_EMAIL: z.email(),
  BOOTSTRAP_PASSWORD: z.string().min(16).max(128),
  BOOTSTRAP_FIRST_NAME: z.string().trim().min(1).max(80),
  BOOTSTRAP_LAST_NAME: z.string().trim().min(1).max(80)
}).safeParse(process.env);

if (!config.success) {
  console.error('Bootstrap: podesite MONGODB_URI i sve BOOTSTRAP_* vrednosti; lozinka mora imati 16–128 znakova.');
  process.exitCode = 1;
} else {
  const d = config.data;
  try {
    await mongoose.connect(d.MONGODB_URI, {serverSelectionTimeoutMS: 10000});
    if (await User.exists({role: d.BOOTSTRAP_ROLE})) {
      throw new Error('Nalog ove privilegovane uloge već postoji. Postojeći nalog nije menjan.');
    }
    if (await User.exists({email: d.BOOTSTRAP_EMAIL.toLowerCase()})) {
      throw new Error('Mejl je već zauzet. Postojeći nalog nije menjan.');
    }
    await User.create({
      firstName: d.BOOTSTRAP_FIRST_NAME,
      lastName: d.BOOTSTRAP_LAST_NAME,
      email: d.BOOTSTRAP_EMAIL,
      passwordHash: await bcrypt.hash(d.BOOTSTRAP_PASSWORD, 12),
      role: d.BOOTSTRAP_ROLE,
      approval: 'approved',
      approvedAt: new Date()
    });
    console.log('Privilegovani nalog je kreiran. Uklonite BOOTSTRAP_* vrednosti iz lokalnog .env fajla.');
  } catch (error) {
    console.error(error.code === 11000 ? 'Bootstrap: nalog već postoji.' : 'Bootstrap nije završen: ' + error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
