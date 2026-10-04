import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { users, dailyRecords, loginHistory } from './src/db/schema.ts';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // 1. Database & Health Status Endpoint
  app.get('/api/database/status', async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allRecords = await db.select().from(dailyRecords);
      const allLogins = await db.select().from(loginHistory);

      res.json({
        online: true,
        engine: 'Cloud SQL (PostgreSQL)',
        region: 'asia-southeast1',
        instance: 'ai-studio-91ad5514',
        database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
        counts: {
          vehicles: allUsers.length,
          records: allRecords.length,
          logins: allLogins.length,
        },
      });
    } catch (err: any) {
      console.error('Database status error:', err);
      res.status(500).json({
        online: false,
        error: err?.message || 'Database unreachable',
      });
    }
  });

  // 2. Authentication: Sign In / Lookup Profile
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { vehicleNumber, email, uid, name } = req.body;
      const cleanVehicle = (vehicleNumber || '').trim().toUpperCase();

      if (!cleanVehicle && !email && !uid) {
        return res.status(400).json({ error: 'Vehicle number or credentials required.' });
      }

      let profileList: any[] = [];
      if (cleanVehicle) {
        profileList = await db.select().from(users).where(eq(users.vehicleNumber, cleanVehicle));
      } else if (email) {
        profileList = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      } else if (uid) {
        profileList = await db.select().from(users).where(eq(users.uid, uid));
      }

      let profile = profileList[0];

      // Auto-provision if user signed in via Google OAuth with no prior profile
      if (!profile && uid && email) {
        const generatedVehicle = 'VEH-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        const inserted = await db
          .insert(users)
          .values({
            uid,
            email: email.toLowerCase(),
            vehicleNumber: cleanVehicle || generatedVehicle,
            name: name || email.split('@')[0],
            phone: '',
            role: 'user',
          })
          .returning();
        profile = inserted[0];
      }

      if (!profile) {
        return res.status(404).json({
          error: `Vehicle registration '${cleanVehicle}' not found in online database. Please register.`,
        });
      }

      // Record login history
      await db.insert(loginHistory).values({
        userId: profile.id,
      });

      res.json({
        user: profile,
        message: 'Successfully authenticated with online Cloud SQL database.',
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err?.message || 'Authentication error' });
    }
  });

  // 3. Register New Vehicle in Online Cloud SQL
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { vehicleNumber, name, phone, email, uid } = req.body;
      const cleanVehicle = (vehicleNumber || '').trim().toUpperCase();
      const cleanName = (name || '').trim();

      if (!cleanVehicle) {
        return res.status(400).json({ error: 'Vehicle number is required.' });
      }
      if (!cleanName) {
        return res.status(400).json({ error: 'Driver name is required.' });
      }

      // Check existing
      const existing = await db.select().from(users).where(eq(users.vehicleNumber, cleanVehicle));
      if (existing.length > 0) {
        return res.status(409).json({ error: `Vehicle ${cleanVehicle} is already registered.` });
      }

      const isFirst = (await db.select().from(users)).length === 0;
      const role = isFirst || cleanVehicle.startsWith('ADM') ? 'admin' : 'user';
      const userUid = uid || 'uid-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const userEmail = email || `${cleanVehicle.toLowerCase()}@vehicle.local`;

      const inserted = await db
        .insert(users)
        .values({
          uid: userUid,
          email: userEmail,
          vehicleNumber: cleanVehicle,
          name: cleanName,
          phone: (phone || '').trim(),
          role,
        })
        .returning();

      const newProfile = inserted[0];

      // Record login audit
      await db.insert(loginHistory).values({
        userId: newProfile.id,
      });

      res.status(201).json({
        user: newProfile,
        message: 'Vehicle account created and saved in online Cloud SQL database.',
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err?.message || 'Registration failed' });
    }
  });

  // 4. Vehicles Directory (Admin & Selector)
  app.get('/api/vehicles', async (_req, res) => {
    try {
      const allVehicles = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(allVehicles);
    } catch (err: any) {
      console.error('Vehicles query error:', err);
      res.status(500).json({ error: err?.message || 'Failed to fetch vehicles' });
    }
  });

  // 5. Update Vehicle Role
  app.patch('/api/vehicles/:id/role', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { role } = req.body;
      if (role !== 'user' && role !== 'admin') {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const updated = await db
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning();

      res.json(updated[0]);
    } catch (err: any) {
      console.error('Update role error:', err);
      res.status(500).json({ error: err?.message || 'Failed to update role' });
    }
  });

  // 6. Daily Records: Query with Filters
  app.get('/api/records', async (req, res) => {
    try {
      const { userId, vehicleNumber, from, to } = req.query as {
        userId?: string;
        vehicleNumber?: string;
        from?: string;
        to?: string;
      };

      const conditions: any[] = [];

      if (userId) {
        conditions.push(eq(dailyRecords.userId, parseInt(userId, 10)));
      }
      if (vehicleNumber) {
        conditions.push(eq(dailyRecords.vehicleNumber, vehicleNumber.toUpperCase()));
      }
      if (from) {
        conditions.push(gte(dailyRecords.recordDate, from));
      }
      if (to) {
        conditions.push(lte(dailyRecords.recordDate, to));
      }

      const query = conditions.length > 0
        ? db.select().from(dailyRecords).where(and(...conditions)).orderBy(desc(dailyRecords.recordDate))
        : db.select().from(dailyRecords).orderBy(desc(dailyRecords.recordDate));

      const records = await query;
      res.json(records);
    } catch (err: any) {
      console.error('Records query error:', err);
      res.status(500).json({ error: err?.message || 'Failed to fetch records' });
    }
  });

  // 7. Daily Records: Create New Daily Entry
  app.post('/api/records', async (req, res) => {
    try {
      const {
        userId,
        vehicleNumber,
        recordDate,
        income,
        incomeDetails,
        cost,
        other,
        otherDetails,
      } = req.body;

      if (!userId || !recordDate) {
        return res.status(400).json({ error: 'userId and recordDate are required' });
      }

      const inserted = await db
        .insert(dailyRecords)
        .values({
          userId: parseInt(userId, 10),
          vehicleNumber: vehicleNumber || '',
          recordDate,
          income: String(Number(income) || 0),
          incomeDetails: (incomeDetails || '').trim(),
          cost: String(Number(cost) || 0),
          other: String(Number(other) || 0),
          otherDetails: (otherDetails || '').trim(),
        })
        .returning();

      res.status(201).json(inserted[0]);
    } catch (err: any) {
      console.error('Insert record error:', err);
      res.status(500).json({ error: err?.message || 'Failed to save record' });
    }
  });

  // 8. Daily Records: Update Existing Entry
  app.put('/api/records/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const {
        recordDate,
        income,
        incomeDetails,
        cost,
        other,
        otherDetails,
      } = req.body;

      const updated = await db
        .update(dailyRecords)
        .set({
          recordDate,
          income: String(Number(income) || 0),
          incomeDetails: (incomeDetails || '').trim(),
          cost: String(Number(cost) || 0),
          other: String(Number(other) || 0),
          otherDetails: (otherDetails || '').trim(),
        })
        .where(eq(dailyRecords.id, id))
        .returning();

      res.json(updated[0]);
    } catch (err: any) {
      console.error('Update record error:', err);
      res.status(500).json({ error: err?.message || 'Failed to update record' });
    }
  });

  // 9. Daily Records: Delete Entry
  app.delete('/api/records/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(dailyRecords).where(eq(dailyRecords.id, id));
      res.json({ success: true, message: 'Record deleted from online database.' });
    } catch (err: any) {
      console.error('Delete record error:', err);
      res.status(500).json({ error: err?.message || 'Failed to delete record' });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FleetLedger Full-Stack Server running at http://0.0.0.0:${PORT}`);
    console.log(`Connected to Cloud SQL Online Database: ${process.env.SQL_DB_NAME}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
