# Authentication & Authorization Requirements
**Kranos Gym Management System**

## 🎯 Overview
Implement comprehensive user authentication and role-based authorization system for multi-user gym management with hierarchical permissions.

## 👥 User Roles & Hierarchy

### 1. Super User (Hardcoded)
- **Purpose**: System owner with ultimate control
- **Credentials**: Username + Password (hardcoded in system)
- **Permissions**: Complete system access including:
  - Manage all admin and trainer accounts
  - Access all system features
  - System settings and configuration
  - User management and role assignment

### 2. Admin Role
- **Purpose**: Gym managers with full operational access
- **Creation**: Super User can create/delete Admin accounts
- **Permissions**: 
  - Settings page access
  - User management (create/edit/delete trainers)
  - All member/plan/membership functionality
  - Full reporting section access
  - Cannot manage other admins or super user

### 3. Trainer Role  
- **Purpose**: Staff members with limited operational access
- **Creation**: Super User and Admins can create/delete Trainer accounts
- **Permissions**:
  - Members section (view, create, edit)
  - Plans section (view, create, edit)
  - Memberships section (view, create, edit)
  - **Excluded**: Reporting section, Settings, User management

### 4. Member Role
- **Purpose**: Future customer portal access
- **Status**: Reserved for future implementation
- **Permissions**: TBD (customer self-service portal)

## 🔐 Authentication Requirements

### Super User Configuration
- **Type**: Hardcoded credentials (not in database)
- **Format**: Username + Password
- **Access**: Full system control
- **Storage**: Environment variables or config file

### Password Policy
- **Minimum Length**: 8 characters
- **Complexity Requirements**:
  - At least 1 special character
  - At least 1 number
  - At least 1 letter
- **First Login**: Force password change for default accounts
- **Validation**: Real-time client-side + server-side

### Session Management
- **Technology**: JWT-based authentication
- **Persistence**: 7-day session duration
- **Remember Me**: Sessions persist across browser restarts
- **Timeout**: No automatic inactivity logout (7-day expiry only)
- **Security**: Secure HTTP-only cookies for token storage

## 🏗️ Database Schema Requirements

### Users Table
```sql
users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'member')),
  full_name TEXT NOT NULL,
  created_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT,
  must_change_password BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE
)
```

### Session Management
- JWT tokens with 7-day expiration
- Refresh token rotation for security
- Session revocation capability

## 🎨 User Interface Requirements

### Navigation Updates
- **Dynamic Menu**: Show/hide sections based on user role
- **Role-based Routing**: Redirect unauthorized access attempts
- **Visual Indicators**: Role badges or indicators in UI

### Login System
- **Location**: Replace current password modal
- **Design**: Full-screen login page or modal
- **Features**: Remember me checkbox, password visibility toggle
- **Error Handling**: Clear validation messages

### User Profile System
- **Avatar**: Profile picture in top-right navigation
- **Dropdown Menu**: On avatar click
  - Profile settings
  - Change password
  - Logout option
- **Profile Page**: Edit personal information, change password

### User Management Interface
- **Location**: Dedicated "Users" section in main navigation
- **Access**: Admin and Super User only
- **Features**:
  - Create new users (with role restrictions)
  - Edit existing users
  - Deactivate/delete users
  - Reset passwords
  - View user activity logs

## 🛠️ Setup & Installation

### First-Time Setup
- **Super User**: Pre-configured (no wizard needed)
- **Admin/Trainer Setup**: Setup wizard for initial account creation
- **Default Accounts**: None (created through wizard)

### Multi-Tenant Preparation
- **Current Scope**: Single gym implementation
- **Future Planning**: Architecture should support multi-tenant expansion
- **Estimation**: Multi-tenant conversion ~3-4 weeks effort
  - Database schema modifications
  - Tenant isolation layer
  - Cross-tenant security
  - UI updates for tenant selection

## 🔒 Security Considerations

### Password Security
- **Hashing**: bcrypt with salt rounds (12+)
- **Storage**: Never store plain text passwords
- **Transmission**: HTTPS only for authentication

### Authorization
- **Middleware**: Role-based route protection
- **API Security**: JWT validation on all protected endpoints
- **CSRF Protection**: Token validation for state-changing operations

### Session Security
- **Token Storage**: Secure HTTP-only cookies
- **Refresh Mechanism**: Automatic token refresh
- **Logout**: Proper token invalidation

## 📋 Implementation Phases

### Phase 1: Core Authentication
1. Database schema implementation
2. JWT session management
3. Login/logout system
4. Password validation

### Phase 2: Role-Based Access
1. User role system
2. Navigation updates
3. Route protection
4. Permission middleware

### Phase 3: User Management
1. User CRUD operations
2. Setup wizard
3. Profile management
4. Password reset functionality

### Phase 4: Enhanced Security
1. Comprehensive testing
2. Security audit
3. Performance optimization
4. Documentation updates

## 🧪 Testing Requirements

### Unit Tests
- Authentication functions
- Password validation
- JWT token handling
- Role permission checks

### Integration Tests
- Login/logout flows
- Role-based navigation
- User management operations
- Session persistence

### Security Tests
- Authentication bypass attempts
- Role escalation testing
- Session hijacking prevention
- Password policy enforcement

## 📚 Documentation Updates

### Memory Files
- Update all CLAUDE.md files with authentication patterns
- Document role-based component usage
- Authentication middleware patterns

### API Documentation
- Protected endpoint specifications
- JWT token requirements
- Role-based access documentation

### User Documentation
- Setup wizard instructions
- User management guide
- Password policy explanation