# Scalable Telemedicine Platform

A production-ready telemedicine platform built with Next.js, PostgreSQL, and Drizzle ORM. This platform enables patients to search for doctors, book appointments, and manage their consultations online.

## 🚀 Features

### For Patients
- ✅ User registration and authentication
- ✅ Search doctors by specialty
- ✅ View doctor profiles with details
- ✅ Browse available appointment slots
- ✅ Book appointments with reason for visit
- ✅ View upcoming and past appointments
- ✅ Cancel appointments

### For Doctors
- ✅ User registration with license verification
- ✅ Manage availability slots
- ✅ View assigned appointments
- ✅ Update profile and specialties
- ✅ Track consultation history

### System Features
- ✅ Partial unique index to prevent double-booking
- ✅ Database-level referential integrity
- ✅ Role-based access control (Patient/Doctor/Admin)
- ✅ Secure password hashing with PBKDF2
- ✅ BigInt support for high-volume data
- ✅ RESTful API with proper error handling

## 🏗️ Architecture

### Database Schema

```
Users (Patients, Doctors, Admins)
  ├── Patients (1:1 with Users)
  │   └── Appointments (1:N)
  │       └── Availability Slots (1:1)
  ├── Doctors (1:1 with Users)
  │   ├── Specialties (N:N)
  │   └── Availability Slots (1:N)
  └── Specialties (N:N)
```

### Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with PBKDF2 hashing
- **Deployment**: Ready for production

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm or yarn

## 🛠️ Installation & Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd telemedicine-platform
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
NODE_ENV=development
```

### 3. Initialize Database

```bash
# Apply schema changes
npx drizzle-kit push

# Seed with test data
curl -X POST http://localhost:3000/api/seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application.

## 🔐 Test Credentials

After seeding, use these credentials:

**Patient Account**
- Email: `patient@example.com`
- Password: `password123`

**Doctor Accounts**
- Email: `cardio@example.com` (Cardiology)
- Email: `derma@example.com` (Dermatology)
- Email: `neuro@example.com` (Neurology)
- Password: `password123` (all)

## 📡 API Documentation

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "confirmPassword": "securepassword123",
  "role": "patient",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "Male"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "password123"
}

# Response
{
  "message": "Login successful",
  "user": {
    "userId": "1",
    "email": "patient@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "patient"
  }
}
```

### Doctors

#### Get All Doctors
```bash
GET /api/doctors

# Filter by specialty
GET /api/doctors?specialtyId=1

# Search by name
GET /api/doctors?search=Sarah
```

#### Get Doctor Details
```bash
GET /api/doctors/{doctorId}
```

#### Get Doctor Availability
```bash
GET /api/doctors/{doctorId}/slots?from=2026-10-24T00:00:00Z&to=2026-10-31T23:59:59Z
```

### Specialties

#### Get All Specialties
```bash
GET /api/specialties
```

#### Create Specialty (Admin)
```bash
POST /api/specialties
Content-Type: application/json

{
  "name": "Psychiatry",
  "description": "Mental health and counseling"
}
```

### Appointments

#### Book Appointment
```bash
POST /api/appointments
Content-Type: application/json

{
  "patientId": "1",
  "slotId": "25",
  "reason": "Regular checkup and consultation"
}

# Response
{
  "message": "Appointment booked successfully",
  "appointment": {
    "appointmentId": "1",
    "patientId": "1",
    "slotId": "25",
    "status": "booked",
    "reason": "Regular checkup and consultation",
    "createdAt": "2026-10-24T18:00:00.000Z"
  }
}
```

#### Get Patient Appointments
```bash
GET /api/appointments?patientId=1

# Filter by status
GET /api/appointments?patientId=1&status=booked
```

#### Cancel Appointment
```bash
POST /api/appointments/{appointmentId}/cancel
```

## 🎨 Pages & Routes

### Patient Routes
- `/` - Home page
- `/register?role=patient` - Patient registration
- `/login` - Login page
- `/patient/dashboard` - Patient dashboard
- `/patient/search` - Find doctors
- `/patient/doctor/[id]` - Doctor profile & booking
- `/patient/appointments` - View appointments

### Doctor Routes
- `/register?role=doctor` - Doctor registration
- `/doctor/dashboard` - Doctor dashboard
- `/doctor/appointments` - View appointments
- `/doctor/availability` - Manage slots

## 🔒 Security Features

- **Password Hashing**: PBKDF2 with salt
- **Double-Booking Prevention**: Partial unique index on (slot_id, status)
- **Referential Integrity**: Foreign keys with cascade deletes
- **Role-Based Access**: Patient/Doctor/Admin roles
- **HTTP-Only Cookies**: Secure session management
- **Input Validation**: Server-side validation on all endpoints

## 📊 Database Indexes

For optimal performance:

```sql
-- Already created in schema
- idx_doctor_slots: (doctor_id)
- idx_slot_times: (start_time, end_time)
- idx_doctor_slot_unique: (doctor_id, start_time, end_time) [UNIQUE]
- idx_patient_appointments: (patient_id)
- idx_appointment_status: (status)
- idx_slot_booking: (slot_id) WHERE status = 'booked' [PARTIAL UNIQUE]
```

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
npm start
```

### Environment Variables for Production

```env
DATABASE_URL=postgresql://user:password@prod-db-host:5432/telemedicine_db
NODE_ENV=production
SEED_KEY=your-secure-seed-key-here
```

### Database Backup
```bash
pg_dump postgresql://user:password@host:5432/db_name > backup.sql
```

## 🧪 Testing

### Test Patient Flow
1. Register as patient
2. Browse doctors by specialty
3. View doctor availability
4. Book appointment
5. View appointments
6. Cancel appointment

### Test Doctor Flow
1. Register as doctor
2. Login to dashboard
3. View profile
4. Manage specialties
5. View appointments

## 📈 Scalability Considerations

- **Database**: Use connection pooling (configured with pg)
- **Caching**: Add Redis for frequently accessed data
- **CDN**: Deploy static assets to CDN
- **Load Balancing**: Use AWS ELB or similar
- **Database Replication**: Set up read replicas
- **Monitoring**: Implement APM and alerting

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify connection string in .env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

### Seed Data Not Created
```bash
# Manually seed database
curl -X POST http://localhost:3000/api/seed
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

## 📝 API Response Format

All API responses follow this format:

**Success (2xx)**
```json
{
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error (4xx, 5xx)**
```json
{
  "error": "Error description"
}
```

## 🔄 Data Flow

### Appointment Booking Flow
```
1. Patient searches doctors
2. Patient views doctor slots
3. Patient selects slot
4. POST /api/appointments
5. Database checks slot availability
6. Creates appointment record
7. Updates slot status to booked
8. Returns confirmation
```

### Double-Booking Prevention
```
1. Partial unique index on (slot_id, status='booked')
2. Database enforces only ONE booked appointment per slot
3. Concurrent requests handled by database lock
4. Second request gets constraint violation
5. API returns 409 Conflict error
```

## 📚 Further Documentation

- [Database Schema Documentation](./docs/schema.md)
- [API Reference](./docs/api.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For issues and questions:
- GitHub Issues: [Open an issue]
- Email: support@example.com

## ✅ Checklist for Production

- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting implemented
- [ ] Logging and monitoring enabled
- [ ] Error tracking (Sentry/Rollbar) set up
- [ ] Performance testing completed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Disaster recovery plan documented

---

**Built with ❤️ using Next.js, PostgreSQL, and Drizzle ORM**
