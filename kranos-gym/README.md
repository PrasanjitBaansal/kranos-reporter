# 🏋️‍♂️ Kranos Gym Management System

A modern, full-featured gym management system built with SvelteKit, featuring a sleek dark theme with neon styling and comprehensive member and membership management capabilities.

## ✨ Features

### 📊 Dashboard
- Real-time statistics (total members, active members, monthly revenue)
- Recent activity feed
- Upcoming membership renewals
- Quick action shortcuts

### 👥 Member Management
- Complete CRUD operations for gym members
- **Interactive Member Details**: Click on any member row to view detailed membership history
- **Advanced Filtering**: Date range filtering by join date and status filtering (Active/Inactive)
- **Enhanced Search**: Real-time search across member names, phone numbers, and emails
- **Member Status Tracking**: Automatic active/inactive status based on membership dates
- **Membership History Modal**: View complete membership history with renewal counts and detailed records
- **Contact Information Management**: Phone, email, and join date tracking

### 💪 Group Plans
- Flexible membership plan creation
- Duration-based pricing
- Auto-generated display names
- Plan activation/deactivation

### 🎯 Membership Tracking
- **Group Class Memberships**: Full lifecycle management with auto-calculated end dates
- **Personal Training**: Session-based tracking with remaining session counts
- Automatic New/Renewal categorization
- Comprehensive membership history

### 📈 Reporting & Analytics
- Financial reports with date range filtering
- Revenue breakdown (Group Classes vs Personal Training)
- Upcoming renewal notifications
- Export capabilities

## 🎨 Design Features

- **Dark Theme**: Modern black background with orange/gold neon accents
- **Responsive Design**: Mobile-optimized layouts
- **Smooth Animations**: Hover effects and slide-up animations
- **Accessibility**: Proper focus states and keyboard navigation
- **Modern UI**: Card-based layouts with glowing effects

## 🚀 Technology Stack

- **Frontend**: SvelteKit 2.x with Svelte 5
- **Database**: SQLite3 with comprehensive schema
- **Styling**: Custom CSS with CSS Variables
- **Build Tool**: Vite 6.x
- **Package Manager**: npm
- **Data Migration**: Excel to SQLite conversion

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/[your-username]/kranos-gym.git
   cd kranos-gym
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # If you have existing Excel data, place it in static/data/
   # Then run the migration
   node src/lib/db/migrate.js
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

## 🗄️ Database Schema

### Members
- Personal information (name, phone, email)
- Join date and status tracking
- Unique phone number constraint

### Group Plans
- Plan name and duration (days)
- Default pricing
- Auto-generated display names
- Active/inactive status

### Group Class Memberships
- Member and plan relationships
- Start/end date auto-calculation
- Payment tracking
- New/Renewal categorization

### Personal Training Memberships
- Session-based tracking
- Remaining session counts
- Purchase date and pricing

## 🎯 Key Workflows

### Adding New Members
1. Navigate to Members section
2. Click "Add New Member"
3. Fill in required information (name, phone)
4. Optionally add email and join date
5. Save to database

### Creating Memberships
1. Go to Memberships section
2. Choose Group Class or Personal Training mode
3. Select member and plan/sessions
4. System auto-calculates end dates and pricing
5. Tracks membership lifecycle

### Generating Reports
1. Access Reporting section
2. Set date range for financial analysis
3. View revenue breakdown by membership type
4. Check upcoming renewals for proactive management

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

### Project Structure

```
src/
├── lib/
│   └── db/
│       ├── database.js      # Database class with all CRUD operations
│       ├── migrate.js       # Excel to SQLite migration
│       └── schema.sql       # Database schema
├── routes/
│   ├── +layout.svelte       # Main layout with navigation
│   ├── +page.svelte         # Dashboard
│   ├── +page.server.js      # Main server load function
│   ├── members/             # Member management
│   ├── plans/               # Group plans management
│   ├── memberships/         # Membership tracking
│   └── reporting/           # Analytics and reports
└── static/
    └── data/                # Excel migration files
```

## 📊 Sample Data

The system comes with migrated sample data:
- **63 Members**: Real gym member data
- **12 Group Plans**: Various MMA and fitness plans
- **109 Group Memberships**: Active and historical memberships
- **6 PT Memberships**: Personal training sessions

## 🔒 Security Features

- Input validation on all forms
- SQL injection prevention
- Phone number uniqueness constraints
- Proper error handling and user feedback

## 🌐 Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Bug Reports

Please use the GitHub Issues page to report bugs or request features.

## 📞 Support

For support or questions, please open an issue on GitHub.

---

**Built with ❤️ using SvelteKit and modern web technologies**