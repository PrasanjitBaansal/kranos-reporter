import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { 
    toastStore, 
    showToast, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo 
} from './toast.js';

describe('Toast Store', () => {
    beforeEach(() => {
        // Clear all toasts before each test
        toastStore.clear();
        // Mock timers for controlled testing
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Store Initialization', () => {
        it('should initialize with empty array', () => {
            const toasts = get(toastStore);
            expect(toasts).toEqual([]);
        });

        it('should be subscribable', () => {
            const unsubscribe = toastStore.subscribe(() => {});
            expect(typeof unsubscribe).toBe('function');
            unsubscribe();
        });
    });

    describe('Adding Toasts', () => {
        it('should add a toast with default values', () => {
            const id = toastStore.add({ message: 'Test toast' });
            
            const toasts = get(toastStore);
            expect(toasts).toHaveLength(1);
            expect(toasts[0]).toMatchObject({
                id,
                type: 'info',
                message: 'Test toast',
                duration: 4000,
                entering: true,
                exiting: false
            });
        });

        it('should add multiple toasts', () => {
            toastStore.add({ message: 'Toast 1' });
            toastStore.add({ message: 'Toast 2' });
            toastStore.add({ message: 'Toast 3' });
            
            const toasts = get(toastStore);
            expect(toasts).toHaveLength(3);
            expect(toasts[0].message).toBe('Toast 1');
            expect(toasts[1].message).toBe('Toast 2');
            expect(toasts[2].message).toBe('Toast 3');
        });

        it('should generate unique IDs', () => {
            const id1 = toastStore.add({ message: 'Toast 1' });
            const id2 = toastStore.add({ message: 'Toast 2' });
            
            expect(id1).not.toBe(id2);
        });

        it('should accept custom toast properties', () => {
            toastStore.add({ 
                message: 'Custom toast',
                type: 'warning',
                duration: 6000
            });
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'warning',
                message: 'Custom toast',
                duration: 6000
            });
        });
    });

    describe('Auto-removal', () => {
        it('should auto-remove toast after duration', () => {
            toastStore.add({ message: 'Auto-remove test', duration: 1000 });
            
            expect(get(toastStore)).toHaveLength(1);
            
            // Fast-forward to just before removal
            vi.advanceTimersByTime(999);
            expect(get(toastStore)).toHaveLength(1);
            
            // Trigger exit animation
            vi.advanceTimersByTime(1);
            const toasts = get(toastStore);
            expect(toasts[0].exiting).toBe(true);
            expect(toasts[0].entering).toBe(false);
            
            // Complete removal after animation
            vi.advanceTimersByTime(300);
            expect(get(toastStore)).toHaveLength(0);
        });

        it('should handle multiple toasts with different durations', () => {
            toastStore.add({ message: 'Short', duration: 1000 });
            toastStore.add({ message: 'Medium', duration: 2000 });
            toastStore.add({ message: 'Long', duration: 3000 });
            
            expect(get(toastStore)).toHaveLength(3);
            
            // First toast starts exiting
            vi.advanceTimersByTime(1000);
            let toasts = get(toastStore);
            expect(toasts[0].exiting).toBe(true);
            expect(toasts[1].exiting).toBe(false);
            expect(toasts[2].exiting).toBe(false);
            
            // First toast removed
            vi.advanceTimersByTime(300);
            expect(get(toastStore)).toHaveLength(2);
            
            // Second toast starts exiting
            vi.advanceTimersByTime(700);
            toasts = get(toastStore);
            expect(toasts[0].exiting).toBe(true);
            expect(toasts[1].exiting).toBe(false);
            
            // All toasts eventually removed
            vi.advanceTimersByTime(2000);
            expect(get(toastStore)).toHaveLength(0);
        });
    });

    describe('Manual Removal', () => {
        it('should manually remove a toast by ID', () => {
            const id = toastStore.add({ message: 'Manual remove test' });
            
            expect(get(toastStore)).toHaveLength(1);
            
            toastStore.remove(id);
            
            // Should start exit animation
            const toasts = get(toastStore);
            expect(toasts[0].exiting).toBe(true);
            
            // Complete removal after animation
            vi.advanceTimersByTime(300);
            expect(get(toastStore)).toHaveLength(0);
        });

        it('should handle removing non-existent ID', () => {
            toastStore.add({ message: 'Test toast' });
            
            // Should not throw error
            expect(() => toastStore.remove(999999)).not.toThrow();
            expect(get(toastStore)).toHaveLength(1);
        });
    });

    describe('Clear Function', () => {
        it('should clear all toasts immediately', () => {
            toastStore.add({ message: 'Toast 1' });
            toastStore.add({ message: 'Toast 2' });
            toastStore.add({ message: 'Toast 3' });
            
            expect(get(toastStore)).toHaveLength(3);
            
            toastStore.clear();
            
            expect(get(toastStore)).toHaveLength(0);
        });
    });

    describe('Convenience Methods', () => {
        it('should show success toast', () => {
            toastStore.success('Success message', 5000);
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'success',
                message: 'Success message',
                duration: 5000
            });
        });

        it('should show error toast', () => {
            toastStore.error('Error message');
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'error',
                message: 'Error message',
                duration: 4000 // default
            });
        });

        it('should show warning toast', () => {
            toastStore.warning('Warning message');
            
            const toasts = get(toastStore);
            expect(toasts[0].type).toBe('warning');
        });

        it('should show info toast', () => {
            toastStore.info('Info message');
            
            const toasts = get(toastStore);
            expect(toasts[0].type).toBe('info');
        });

        it('should use show method with custom type', () => {
            toastStore.show('Custom message', 'custom', 2000);
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'custom',
                message: 'Custom message',
                duration: 2000
            });
        });
    });

    describe('Exported Functions', () => {
        it('should work with showSuccess', () => {
            showSuccess('Success!');
            
            const toasts = get(toastStore);
            expect(toasts[0].type).toBe('success');
        });

        it('should work with showError', () => {
            showError('Error!', 6000);
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'error',
                duration: 6000
            });
        });

        it('should work with showWarning', () => {
            showWarning('Warning!');
            
            const toasts = get(toastStore);
            expect(toasts[0].type).toBe('warning');
        });

        it('should work with showInfo', () => {
            showInfo('Info!');
            
            const toasts = get(toastStore);
            expect(toasts[0].type).toBe('info');
        });

        it('should work with showToast', () => {
            showToast({ 
                message: 'Custom toast',
                type: 'custom',
                duration: 3000
            });
            
            const toasts = get(toastStore);
            expect(toasts[0]).toMatchObject({
                type: 'custom',
                message: 'Custom toast',
                duration: 3000
            });
        });
    });

    describe('Animation States', () => {
        it('should manage entering state correctly', () => {
            toastStore.add({ message: 'Animation test' });
            
            const toasts = get(toastStore);
            expect(toasts[0].entering).toBe(true);
            expect(toasts[0].exiting).toBe(false);
        });

        it('should transition to exiting state', () => {
            toastStore.add({ message: 'Exit test', duration: 1000 });
            
            vi.advanceTimersByTime(1000);
            
            const toasts = get(toastStore);
            expect(toasts[0].entering).toBe(false);
            expect(toasts[0].exiting).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero duration', () => {
            toastStore.add({ message: 'Zero duration', duration: 0 });
            
            // Should immediately start exiting
            vi.advanceTimersByTime(1);
            const toasts = get(toastStore);
            expect(toasts[0].exiting).toBe(true);
        });

        it('should handle very long messages', () => {
            const longMessage = 'A'.repeat(1000);
            toastStore.add({ message: longMessage });
            
            const toasts = get(toastStore);
            expect(toasts[0].message).toBe(longMessage);
        });

        it('should handle rapid additions', () => {
            for (let i = 0; i < 10; i++) {
                toastStore.add({ message: `Toast ${i}` });
            }
            
            expect(get(toastStore)).toHaveLength(10);
        });

        it('should handle undefined message gracefully', () => {
            toastStore.add({});
            
            const toasts = get(toastStore);
            expect(toasts[0].message).toBeUndefined();
        });
    });

    describe('Store Subscription', () => {
        it('should notify subscribers on add', () => {
            const subscriber = vi.fn();
            const unsubscribe = toastStore.subscribe(subscriber);
            
            toastStore.add({ message: 'Test' });
            
            expect(subscriber).toHaveBeenCalledTimes(2); // Initial + add
            
            unsubscribe();
        });

        it('should notify subscribers on remove', () => {
            const id = toastStore.add({ message: 'Test' });
            
            const subscriber = vi.fn();
            const unsubscribe = toastStore.subscribe(subscriber);
            
            toastStore.remove(id);
            
            expect(subscriber).toHaveBeenCalledTimes(2); // Initial + remove
            
            unsubscribe();
        });

        it('should notify subscribers on clear', () => {
            toastStore.add({ message: 'Test' });
            
            const subscriber = vi.fn();
            const unsubscribe = toastStore.subscribe(subscriber);
            
            toastStore.clear();
            
            expect(subscriber).toHaveBeenCalledTimes(2); // Initial + clear
            
            unsubscribe();
        });

        it('should stop notifying after unsubscribe', () => {
            const subscriber = vi.fn();
            const unsubscribe = toastStore.subscribe(subscriber);
            
            unsubscribe();
            
            toastStore.add({ message: 'Test' });
            
            expect(subscriber).toHaveBeenCalledTimes(1); // Only initial
        });
    });
});