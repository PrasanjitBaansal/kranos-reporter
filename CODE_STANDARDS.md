# Code Standards & Conventions

This document outlines the coding standards and conventions for the Kranos Gym Management System.

## General Principles

- **Consistency**: Follow established patterns within the codebase
- **Readability**: Write code that is easy to understand and maintain
- **Security**: Never expose sensitive data or commit secrets to the repository
- **Simplicity**: Prefer simple, straightforward solutions over complex ones

## JavaScript Standards

### Code Style

- Use **camelCase** for variables and functions
- Use **PascalCase** for classes and constructors
- Use **UPPER_SNAKE_CASE** for constants
- Use **kebab-case** for file names
- Use 4 spaces for indentation (no tabs)

```javascript
// Good
const memberData = {};
class DatabaseManager {}
const API_BASE_URL = 'http://localhost:3000';

// Bad
const member_data = {};
class databaseManager {}
const apiBaseUrl = 'http://localhost:3000';
```

### Functions and Methods

- Use **async/await** for asynchronous operations
- Return consistent response objects with `success`, `message`, and data properties
- Use descriptive function names that indicate their purpose
- Keep functions focused on a single responsibility

```javascript
// Good
async function getMemberById(id) {
    try {
        const member = await db.get('SELECT * FROM members WHERE id = ?', [id]);
        return { success: true, data: member };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Bad
function getMember(id) {
    // synchronous code that should be async
}
```

### Error Handling

- Always use try-catch blocks for async operations
- Return structured error responses instead of throwing
- Log errors appropriately without exposing sensitive information
- Provide meaningful error messages to users

```javascript
// Good
try {
    const result = await database.createMember(memberData);
    return { success: true, data: result };
} catch (error) {
    console.error('Database error:', error.message);
    return { success: false, message: 'Failed to create member' };
}

// Bad
const result = database.createMember(memberData); // No error handling
```

## Database Standards

### Table and Column Naming

- Use **snake_case** for table and column names
- Use descriptive names that clearly indicate the data stored
- Use singular nouns for table names
- Include foreign key suffix `_id` for references

```sql
-- Good
CREATE TABLE group_class_memberships (
    id INTEGER PRIMARY KEY,
    member_id INTEGER,
    start_date TEXT
);

-- Bad
CREATE TABLE GroupClassMembership (
    ID INTEGER PRIMARY KEY,
    MemberID INTEGER,
    StartDate TEXT
);
```

### Query Standards

- Use parameterized queries to prevent SQL injection
- Use explicit column names instead of SELECT *
- Use meaningful aliases for joined tables
- Format complex queries for readability

```javascript
// Good
const query = `
    SELECT gcm.id, gcm.start_date, m.name as member_name
    FROM group_class_memberships gcm
    JOIN members m ON gcm.member_id = m.id
    WHERE gcm.is_active = ?
`;

// Bad
const query = 'SELECT * FROM group_class_memberships WHERE is_active = ' + status;
```

## File Organization

### Directory Structure

```
src/
├── lib/
│   ├── db/
│   │   ├── database.js      # Database operations
│   │   ├── schema.sql       # Database schema
│   │   └── migrate.js       # Migration scripts
│   ├── auth.js              # Authentication logic
│   └── utils.js             # Utility functions
├── routes/                  # API routes
├── middleware/              # Express middleware
├── public/                  # Static files
└── views/                   # Templates
```

### File Naming

- Use **kebab-case** for file names
- Use descriptive names that indicate the file's purpose
- Group related functionality in appropriate directories

## API Standards

### Route Naming

- Use RESTful conventions for API endpoints
- Use plural nouns for resource collections
- Use HTTP methods appropriately (GET, POST, PUT, DELETE)

```javascript
// Good
GET    /api/members          // Get all members
GET    /api/members/:id      // Get specific member
POST   /api/members          // Create new member
PUT    /api/members/:id      // Update member
DELETE /api/members/:id      // Delete member

// Bad
GET /api/getMember/:id
POST /api/createMember
```

### Response Format

- Return consistent JSON response format
- Include appropriate HTTP status codes
- Provide meaningful error messages

```javascript
// Success Response
{
    "success": true,
    "data": { ... },
    "message": "Operation completed successfully"
}

// Error Response
{
    "success": false,
    "message": "Error description",
    "error": "VALIDATION_ERROR"
}
```

## Security Standards

### Authentication

- Never store passwords in plain text
- Use bcrypt for password hashing
- Implement session timeout and validation
- Use secure session tokens

### Data Protection

- Validate all user inputs
- Use parameterized queries for database operations
- Never log sensitive information (passwords, tokens)
- Implement proper authorization checks

```javascript
// Good
const hashedPassword = await bcrypt.hash(password, 10);

// Bad
const password = req.body.password; // Direct storage
```

## Testing Standards

### Test Organization

- Create tests for all critical functionality
- Use descriptive test names that explain the scenario
- Test both success and error cases
- Keep tests isolated and independent

```javascript
// Good
describe('Member Management', () => {
    test('should create member with valid data', async () => {
        // Test implementation
    });
    
    test('should reject member with duplicate phone', async () => {
        // Test implementation
    });
});
```

## Form Validation Standards

### Validation Architecture

- **NO HTML5 validation** - Always add `novalidate` attribute to forms
- **Custom JavaScript validation only** - Use consistent validation patterns
- **Client-side validation** - Validate before form submission via SvelteKit's `use:enhance`
- **Real-time error clearing** - Clear errors when user corrects input

### Validation Function Pattern

```javascript
function validateForm(formData) {
    const errors = {};
    
    // Field validation
    const fieldValue = formData.get('field_name');
    if (!fieldValue || !validationTest(fieldValue)) {
        errors.field_name = 'Error message';
    }
    
    return errors;
}

const submitForm = () => {
    return async ({ formData, result }) => {
        // Client-side validation
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            formErrors = errors;
            return;
        }
        
        // Proceed with submission
        isLoading = true;
        formErrors = {};
        // Handle result...
    };
};
```

### Error Display Standards

```svelte
<!-- Input with error styling -->
<input
    class="form-control"
    class:error={formErrors.field_name}
    on:input={() => {
        if (formErrors.field_name) {
            formErrors = { ...formErrors, field_name: '' };
        }
    }}
/>

<!-- Error message display -->
{#if formErrors.field_name}
    <span class="error-message">{formErrors.field_name}</span>
{/if}
```

### Common Validation Patterns

```javascript
// Required field
if (!value || !value.trim()) {
    errors.field = 'Field is required';
}

// Phone number (exactly 10 digits)
if (!phone || !/^\d{10}$/.test(phone)) {
    errors.phone = 'Phone number must be exactly 10 digits';
}

// Email (optional)
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please enter a valid email address';
}

// Positive number
if (!amount || amount <= 0 || isNaN(Number(amount))) {
    errors.amount = 'Amount must be a positive number';
}

// Positive integer
if (!value || value <= 0 || !Number.isInteger(Number(value))) {
    errors.field = 'Value must be a positive whole number';
}

// Alphanumeric with spaces
if (!name || !/^[a-zA-Z0-9\s]+$/.test(name.trim())) {
    errors.name = 'Name can only contain letters, numbers, and spaces';
}
```

## Documentation Standards

### Code Comments

- Write comments for complex business logic
- Explain the "why" not just the "what"
- Keep comments up to date with code changes
- Use JSDoc for function documentation

```javascript
/**
 * Calculates membership end date based on plan duration
 * @param {string} startDate - ISO date string for membership start
 * @param {number} durationDays - Number of days in the plan
 * @returns {string} ISO date string for membership end
 */
function calculateEndDate(startDate, durationDays) {
    // Implementation
}
```

### Changelog Maintenance

- Update CHANGELOG.md after completing features
- Use clear, descriptive entries
- Group related changes together
- Include file paths for reference

## Performance Standards

### Database Operations

- Use indexes for frequently queried columns
- Limit result sets when possible
- Use connection pooling for production
- Cache frequently accessed data when appropriate

### Code Optimization

- Avoid unnecessary database queries
- Use Promise.all() for concurrent operations
- Implement proper error handling without performance penalties
- Profile and monitor application performance

## Commit Standards

### Commit Messages

- Use clear, descriptive commit messages
- Start with a verb in present tense
- Keep the first line under 50 characters
- Include more details in the body if needed

```
// Good
Add member validation to registration form

// Bad
fixes
updated stuff
```

### Git Workflow

- Create feature branches for new development
- Use pull requests for code review
- Keep commits focused on single changes
- Test changes before committing