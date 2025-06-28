# Stores Module Documentation

## Toast Notification System

### Store Architecture
```javascript
// Advanced toast store with animation states
function createToastStore() {
    const { subscribe, set, update } = writable([]);
    
    return {
        subscribe,
        add: (toast) => {
            // Creates toast with unique ID and animation states
            // Auto-removes after duration with exit animation
        },
        remove: (id) => {
            // Manual removal with exit animation
        },
        // Convenience methods for different toast types
        success: (message, duration) => { /* */ },
        error: (message, duration) => { /* */ },
        warning: (message, duration) => { /* */ },
        info: (message, duration) => { /* */ }
    };
}
```

### Toast Object Structure
```javascript
{
    id: number,              // Unique identifier (Date.now() + Math.random())
    type: string,            // 'success' | 'error' | 'warning' | 'info'
    message: string,         // Display message
    duration: number,        // Auto-removal time (default: 4000ms)
    entering: boolean,       // Animation state for entry
    exiting: boolean         // Animation state for exit
}
```

### Animation States Management
- **Entering**: Initially true for slide-in animation
- **Exiting**: Set to true before removal for slide-out animation
- **Transition Duration**: 300ms for smooth exit animation
- **Auto-removal**: Triggered after specified duration

### Usage Patterns

#### Standard Import and Usage
```javascript
import { showSuccess, showError } from '$lib/stores/toast.js';

// Success notification
showSuccess('Member created successfully!');

// Error notification with custom duration
showError('Operation failed. Please try again.', 6000);
```

#### Advanced Toast Store Usage
```javascript
import { toastStore } from '$lib/stores/toast.js';

// Custom toast with all options
toastStore.add({
    type: 'warning',
    message: 'This action cannot be undone',
    duration: 8000
});

// Manual removal
const toastId = toastStore.success('Processing...');
// Later...
toastStore.remove(toastId);

// Clear all toasts
toastStore.clear();
```

### Integration with Forms

#### SvelteKit Form Enhancement
```javascript
const submitForm = () => {
    return async ({ formData, result }) => {
        // Validation and processing...
        
        if (result.type === 'success') {
            if (result.data?.success === false) {
                showError(result.data.error);
            } else {
                showSuccess(isEditing ? 'Updated successfully!' : 'Created successfully!');
                closeModal();
                await invalidateAll();
            }
        } else {
            showError('An error occurred. Please try again.');
        }
    };
};
```

#### Server Action Integration
```javascript
// In +page.server.js
export const actions = {
    create: async ({ request }) => {
        try {
            // Database operations...
            return { success: true, member: result };
        } catch (error) {
            // Error will be displayed via toast in client
            return { success: false, error: 'Member could not be created' };
        }
    }
};
```

## State Management Patterns

### Reactive Store Usage
```javascript
// Subscribe to toast notifications
import { toastStore } from '$lib/stores/toast.js';

// In Svelte component
$: toasts = $toastStore;

// Template usage
{#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" class:entering={toast.entering} class:exiting={toast.exiting}>
        {toast.message}
    </div>
{/each}
```

### Store Extension Patterns
- **Convenience Exports**: Individual functions for easy importing
- **Type Safety**: Consistent type values across application
- **Error Handling**: Graceful handling of edge cases in store operations
- **Performance**: Efficient array operations with proper immutability

## CSS Integration

### Toast Styling Requirements
```css
.toast {
    /* Base toast styles */
    transition: all 300ms ease-in-out;
}

.toast.entering {
    /* Entry animation styles */
    transform: translateX(0);
    opacity: 1;
}

.toast.exiting {
    /* Exit animation styles */
    transform: translateX(100%);
    opacity: 0;
}

.toast-success { /* Success styling */ }
.toast-error { /* Error styling */ }
.toast-warning { /* Warning styling */ }
.toast-info { /* Info styling */ }
```

### Theme Integration
- **CSS Variables**: Use theme colors for consistent appearance
- **Dark/Light Mode**: Automatic adaptation to theme changes
- **Responsive Design**: Proper positioning and sizing across devices

## Future Store Considerations

### Potential Additional Stores
- **Loading State Store**: Global loading indicators for long operations
- **User Preferences Store**: Client-side settings and preferences
- **Form State Store**: Shared form state across components
- **Modal State Store**: Global modal management system

### Store Best Practices
- **Single Responsibility**: Each store handles one specific concern
- **Immutable Updates**: Always create new objects/arrays for updates
- **Cleanup**: Proper subscription cleanup in components
- **Performance**: Minimize unnecessary reactivity triggers