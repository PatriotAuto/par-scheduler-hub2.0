const requireRole = require('./src/requireRole');
const { prisma } = require('./src/db');
const { authMiddleware, JWT_SECRET } = require('./src/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the new scheduler UI as the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scheduler.html'));
});

app.get('/health', async (req, res) => {
  try {
    // Simple test query: count tenants
    const tenantCount = await prisma.tenant.count();
    res.json({ ok: true, tenantCount });
  } catch (err) {
    console.error('DB Health Check Error:', err);
    res
      .status(500)
      .json({ ok: false, error: 'DB connection failed', details: err.message });
  }
});

// One-time route to create your initial tenant + admin user
app.post('/setup-initial-user', async (req, res) => {
  try {
    const { tenantName, email, password } = req.body;

    if (!tenantName || !email || !password) {
      return res
        .status(400)
        .json({ error: 'tenantName, email, and password are required' });
    }

    // Check if a user already exists with this email
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'User with this email already exists' });
    }

    // Create a tenant (your company)
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
      },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create an admin user tied to that tenant
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });

    res.json({
      ok: true,
      tenant,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Setup error:', err);
    res
      .status(500)
      .json({ ok: false, error: 'Setup failed', details: err.message });
  }
});

// One-time route to seed scheduler data
app.post('/setup-scheduler-data', async (req, res) => {
  try {
    // Expect: { tenantId?: string }
    // If tenantId not provided, we'll use the first tenant in DB.
    const { tenantId: tenantIdFromBody } = req.body || {};

    const tenant =
      tenantIdFromBody
        ? await prisma.tenant.findUnique({ where: { id: tenantIdFromBody } })
        : await prisma.tenant.findFirst();

    if (!tenant) {
      return res.status(400).json({ ok: false, error: 'No tenant found. Run /setup-initial-user first.' });
    }

    const tenantId = tenant.id;

    // Techs (create if none)
    const existingTechCount = await prisma.tech.count({ where: { tenantId } });

    if (existingTechCount === 0) {
      await prisma.tech.createMany({
        data: [
          { tenantId, name: 'Mike (A-Tech)' },
          { tenantId, name: 'Sara (B-Tech)' },
          { tenantId, name: 'Chris (Lube)' },
        ],
      });
    }

    const techs = await prisma.tech.findMany({ where: { tenantId } });

    // Bays
    const existingBayCount = await prisma.bay.count({ where: { tenantId } });
    if (existingBayCount === 0) {
      await prisma.bay.createMany({
        data: [
          { tenantId, name: 'Bay 1' },
          { tenantId, name: 'Bay 2' },
        ],
      });
    }

    // Skills
    const skillNames = ['Brakes', 'Diagnostics', 'Oil Change', 'Tires'];
    for (const name of skillNames) {
      await prisma.skill.upsert({
        where: { tenantId_name: { tenantId, name } },
        update: {},
        create: { tenantId, name },
      });
    }

    const skills = await prisma.skill.findMany({ where: { tenantId } });
    const skillByName = Object.fromEntries(skills.map(s => [s.name, s]));

    // Services + required skills
    const servicesToCreate = [
      { name: 'Oil Change', defaultMins: 30, required: [{ skill: 'Oil Change', minLevel: 1 }] },
      { name: 'Brake Inspection', defaultMins: 60, required: [{ skill: 'Brakes', minLevel: 1 }] },
      { name: 'Check Engine Light Diagnosis', defaultMins: 90, required: [{ skill: 'Diagnostics', minLevel: 2 }] },
      { name: 'Tire Rotation', defaultMins: 30, required: [{ skill: 'Tires', minLevel: 1 }] },
    ];

    for (const svc of servicesToCreate) {
      const service = await prisma.service.upsert({
        where: { tenantId_name: { tenantId, name: svc.name } },
        update: { defaultMins: svc.defaultMins, isActive: true },
        create: { tenantId, name: svc.name, defaultMins: svc.defaultMins, isActive: true },
      });

      for (const reqSkill of svc.required) {
        const skill = skillByName[reqSkill.skill];
        if (!skill) continue;

        await prisma.serviceRequiredSkill.upsert({
          where: { serviceId_skillId: { serviceId: service.id, skillId: skill.id } },
          update: { minLevel: reqSkill.minLevel, tenantId },
          create: { tenantId, serviceId: service.id, skillId: skill.id, minLevel: reqSkill.minLevel },
        });
      }
    }

    // Tech skills (simple spread)
    // Mike: everything lvl 3
    // Sara: brakes/tires lvl 2, oil lvl 2, diag lvl 1
    // Chris: oil lvl 3, tires lvl 2
    const mike = techs.find(t => t.name.includes('Mike')) || techs[0];
    const sara = techs.find(t => t.name.includes('Sara')) || techs[1];
    const chris = techs.find(t => t.name.includes('Chris')) || techs[2];

    async function upsertTechSkill(techId, skillName, level) {
      const skill = skillByName[skillName];
      if (!skill) return;
      await prisma.techSkill.upsert({
        where: { techId_skillId: { techId, skillId: skill.id } },
        update: { level, tenantId },
        create: { tenantId, techId, skillId: skill.id, level },
      });
    }

    if (mike) {
      await upsertTechSkill(mike.id, 'Brakes', 3);
      await upsertTechSkill(mike.id, 'Diagnostics', 3);
      await upsertTechSkill(mike.id, 'Oil Change', 3);
      await upsertTechSkill(mike.id, 'Tires', 3);
    }

    if (sara) {
      await upsertTechSkill(sara.id, 'Brakes', 2);
      await upsertTechSkill(sara.id, 'Diagnostics', 1);
      await upsertTechSkill(sara.id, 'Oil Change', 2);
      await upsertTechSkill(sara.id, 'Tires', 2);
    }

    if (chris) {
      await upsertTechSkill(chris.id, 'Oil Change', 3);
      await upsertTechSkill(chris.id, 'Tires', 2);
      await upsertTechSkill(chris.id, 'Brakes', 1);
    }

    // Schedule rules: Mon–Fri 08:00–17:00, Sat/Sun off
    const scheduleTemplate = [
      { day: 'MON', startTime: '08:00', endTime: '17:00', isWorking: true },
      { day: 'TUE', startTime: '08:00', endTime: '17:00', isWorking: true },
      { day: 'WED', startTime: '08:00', endTime: '17:00', isWorking: true },
      { day: 'THU', startTime: '08:00', endTime: '17:00', isWorking: true },
      { day: 'FRI', startTime: '08:00', endTime: '17:00', isWorking: true },
      { day: 'SAT', startTime: '08:00', endTime: '17:00', isWorking: false },
      { day: 'SUN', startTime: '08:00', endTime: '17:00', isWorking: false },
    ];

    for (const tech of techs) {
      for (const row of scheduleTemplate) {
        await prisma.techScheduleRule.upsert({
          where: { techId_day: { techId: tech.id, day: row.day } },
          update: { startTime: row.startTime, endTime: row.endTime, isWorking: row.isWorking, tenantId },
          create: { tenantId, techId: tech.id, day: row.day, startTime: row.startTime, endTime: row.endTime, isWorking: row.isWorking },
        });
      }
    }

    // Create a couple sample appointments today
    const now = new Date();
    const start1 = new Date(now); start1.setHours(9, 0, 0, 0);
    const end1 = new Date(now); end1.setHours(9, 30, 0, 0);

    const start2 = new Date(now); start2.setHours(10, 0, 0, 0);
    const end2 = new Date(now); end2.setHours(11, 0, 0, 0);

    // Only insert if no appointments today
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

    const apptCountToday = await prisma.appointment.count({
      where: { tenantId, startTime: { gte: dayStart, lte: dayEnd } },
    });

    if (apptCountToday === 0 && techs.length > 0) {
      const oilChange = await prisma.service.findFirst({ where: { tenantId, name: 'Oil Change' } });
      const brake = await prisma.service.findFirst({ where: { tenantId, name: 'Brake Inspection' } });
      const bay1 = await prisma.bay.findFirst({ where: { tenantId, name: 'Bay 1' } });

      await prisma.appointment.create({
        data: {
          tenantId,
          title: 'Oil Change - Walk-in',
          startTime: start1,
          endTime: end1,
          techId: chris?.id || techs[0].id,
          serviceId: oilChange?.id,
          bayId: bay1?.id,
          source: 'MANUAL',
          status: 'SCHEDULED',
        },
      });

      await prisma.appointment.create({
        data: {
          tenantId,
          title: 'Brake Inspection - Appointment',
          startTime: start2,
          endTime: end2,
          techId: sara?.id || techs[0].id,
          serviceId: brake?.id,
          bayId: bay1?.id,
          source: 'MANUAL',
          status: 'CONFIRMED',
        },
      });
    }

    return res.json({
      ok: true,
      tenantId,
      techCount: techs.length,
      message: 'Seeded scheduler data (techs, bays, skills, services, schedules, sample appointments).',
    });
  } catch (err) {
    console.error('setup-scheduler-data error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Login endpoint: internal users log in with email/password
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res
        .status(401)
        .json({ ok: false, error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ ok: false, error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res
      .status(500)
      .json({ ok: false, error: 'Login failed', details: err.message });
  }
});

// Get current user info
app.get('/me', authMiddleware, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// Create a new employee/user (only ADMIN can do this)
app.post('/users', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const currentUser = req.user;

    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ ok: false, error: 'email, password, and role are required' });
    }

    const allowedRoles = ['ADMIN', 'MANAGER', 'DISPATCH', 'TECH', 'VIEW_ONLY'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ ok: false, error: 'Invalid role' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ ok: false, error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        tenantId: currentUser.tenantId, // same company
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    res.json({ ok: true, user: newUser });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ ok: false, error: 'Failed to create user', details: err.message });
  }
});

// List all users (ADMIN and MANAGER can view)
app.get('/users', authMiddleware, requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ok: true, users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ ok: false, error: 'Failed to list users', details: err.message });
  }
});
// ===== Scheduler API =====
// TEMP: create a tech manually (ADMIN only)
app.post('/api/techs', authMiddleware, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ ok: false, error: 'name is required' });
    }

    const tech = await prisma.tech.create({
      data: {
        tenantId: req.user.tenantId,
        name,
      },
    });

    res.json({ ok: true, tech });
  } catch (err) {
    console.error('POST /api/techs error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// List techs
app.get('/api/techs', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'TECH', 'VIEW_ONLY'), async (req, res) => {
  try {
    const techs = await prisma.tech.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json({ ok: true, techs });
  } catch (err) {
    console.error('GET /api/techs error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List services (with default duration)
app.get('/api/services', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'TECH', 'VIEW_ONLY'), async (req, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { tenantId: req.user.tenantId, isActive: true },
      select: { id: true, name: true, defaultMins: true },
      orderBy: { name: 'asc' },
    });
    res.json({ ok: true, services });
  } catch (err) {
    console.error('GET /api/services error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// List appointments in a date range: /api/appointments?start=YYYY-MM-DD&end=YYYY-MM-DD
app.get('/api/appointments', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'TECH', 'VIEW_ONLY'), async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ ok: false, error: 'start and end are required (YYYY-MM-DD)' });
    }

    const startDate = new Date(`${start}T00:00:00.000`);
    const endDate = new Date(`${end}T23:59:59.999`);

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: req.user.tenantId,
        startTime: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        status: true,
        techId: true,
        bayId: true,
        serviceId: true,
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ ok: true, appointments });
  } catch (err) {
    console.error('GET /api/appointments error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Create appointment
app.post('/api/appointments', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH'), async (req, res) => {
  try {
    const { title, startTime, endTime, techId, serviceId, bayId, status } = req.body;

    if (!title || !startTime || !endTime || !techId) {
      return res.status(400).json({ ok: false, error: 'title, startTime, endTime, techId are required' });
    }

    const appt = await prisma.appointment.create({
      data: {
        tenantId: req.user.tenantId,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        techId,
        serviceId: serviceId || null,
        bayId: bayId || null,
        source: 'MANUAL',
        status: status || 'SCHEDULED',
      },
    });

    res.json({ ok: true, appointment: appt });
  } catch (err) {
    console.error('POST /api/appointments error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
// Test routes - these show the access matrix working
app.get('/scheduler', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'TECH'), (req, res) => {
  res.json({ ok: true, message: 'Scheduler access granted', user: req.user });
});

app.get('/customers', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'TECH', 'VIEW_ONLY'), (req, res) => {
  res.json({ ok: true, message: 'Customers access granted', user: req.user });
});

app.get('/invoices', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH', 'VIEW_ONLY'), (req, res) => {
  res.json({ ok: true, message: 'Invoices access granted', user: req.user });
});

app.get('/hr', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({ ok: true, message: 'HR access granted', user: req.user });
});

app.get('/reports', authMiddleware, requireRole('ADMIN', 'MANAGER', 'VIEW_ONLY'), (req, res) => {
  res.json({ ok: true, message: 'Reports access granted', user: req.user });
});

app.get('/settings', authMiddleware, requireRole('ADMIN', 'MANAGER'), (req, res) => {
  res.json({ ok: true, message: 'Settings access granted', user: req.user });
});

// Example: scheduler access (ADMIN, MANAGER, DISPATCH)
app.get('/scheduler/secure-test', authMiddleware, requireRole('ADMIN', 'MANAGER', 'DISPATCH'), (req, res) => {
  res.json({ ok: true, message: 'You can access scheduler features', user: req.user });
});

// Example: tech-only access
app.get('/tech/secure-test', authMiddleware, requireRole('TECH'), (req, res) => {
  res.json({ ok: true, message: 'You can access tech features', user: req.user });
});

// Example: admin-only access (HR/admin)
app.get('/admin/secure-test', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({ ok: true, message: 'You can access admin features', user: req.user });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port', PORT);
});