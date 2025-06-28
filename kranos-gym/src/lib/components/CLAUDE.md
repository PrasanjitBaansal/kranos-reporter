# Components Module Documentation

## Form Validation Architecture

### Core Validation Strategy
- **NO HTML5 validation**: All forms use `novalidate` attribute
- **Custom JavaScript only**: Consistent validation experience across all forms
- **Real-time error clearing**: Validation errors disappear when user corrects input
- **Client-side pre-validation**: Runs before SvelteKit's `use:enhance`

### Validation Implementation Pattern
```javascript
function validateForm(formData) {
    const errors = {};
    // Field-specific validation logic
    return errors;
}

const submitForm = () => {
    return async ({ formData, result }) => {
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            formErrors = errors;
            return;
        }
        // Proceed with submission
    };
};
```

### Form Field Patterns

#### Members Form Validation
- **Name**: Required, alphanumeric + spaces only `/^[a-zA-Z0-9\s]+$/`
- **Phone**: Required, exactly 10 digits `/^\d{10}$/` (when not editing)
- **Email**: Optional, valid email format `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Join Date**: Required, any valid date

#### Plans Form Validation
- **Plan Name**: Required, non-empty string after trimming
- **Duration**: Required, positive integer using `Number.isInteger(Number(value))`
- **Default Amount**: Optional, positive number if provided
- **Display Name Uniqueness**: Auto-generated, checked against existing plans

#### Memberships Form Validation
**Group Class:**
- **Member Selection**: Required, must select from active members
- **Plan Selection**: Required, must select from active plans
- **Start Date**: Required, valid date
- **Amount Paid**: Required, positive number

**Personal Training:**
- **Member Selection**: Required, must select from active members
- **Sessions Total**: Required, positive integer
- **Amount Paid**: Required, positive number

## Component Architecture

### Modal Components
- **Modal.svelte**: Base modal with close functionality and backdrop
- **MemberDetailsModal.svelte**: Specialized for member history display
- **PasswordModal.svelte**: Admin authentication for settings

### Modal Usage Pattern
```svelte
{#if showModal}
    <Modal on:close={closeModal} title="Modal Title">
        <!-- Modal content -->
    </Modal>
{/if}
```

### Toast Notification System
- **Toast.svelte**: Advanced toast display with animation states
- **Integration**: Uses toast store for consistent messaging
- **Animation States**: entering, exiting with 300ms transition duration

## Error Display Standards

### Error Message Format
```svelte
<input
    class="form-control"
    class:error={formErrors.fieldName}
    on:input={() => {
        if (formErrors.fieldName) {
            formErrors = { ...formErrors, fieldName: '' };
        }
    }}
/>
{#if formErrors.fieldName}
    <span class="error-message">{formErrors.fieldName}</span>
{/if}
```

### CSS Error Styling
```css
.form-control.error {
    border-color: #ff4444;
    box-shadow: 0 0 0 2px rgba(255, 68, 68, 0.2);
}

.error-message {
    color: #ff4444;
    font-size: 0.875rem;
    margin-top: 0.25rem;
}
```

## Component State Management

### Form State Pattern
```javascript
// Standard form state variables
let isLoading = false;
let formErrors = {};
let showModal = false;
let selectedItem = null;
let isEditing = false;

// Real-time validation clearing
function clearFieldError(fieldName) {
    if (formErrors[fieldName]) {
        formErrors = { ...formErrors, [fieldName]: '' };
    }
}
```

### Loading State Integration
- **Button States**: Disabled during loading with spinner indication
- **Form Lock**: Prevent multiple submissions during processing
- **Visual Feedback**: Loading spinners and disabled states

## Theme Integration

### CSS Variable Usage
- **Primary Colors**: `var(--primary)`, `var(--primary-dark)`, `var(--primary-light)`
- **Background System**: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`
- **Text Colors**: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`
- **Status Colors**: `var(--success)`, `var(--error)`, `var(--warning)`

### Responsive Design
- **Mobile-first**: Base styles for mobile, enhanced for desktop
- **Flexible Layouts**: Flexbox with gap properties for consistent spacing
- **Breakpoint**: `@media (max-width: 768px)` for mobile adaptations