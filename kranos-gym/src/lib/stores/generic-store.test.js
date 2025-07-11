import { describe, it, expect, beforeEach, vi } from 'vitest';
import { writable, readable, derived, get } from 'svelte/store';

describe('Svelte Store Patterns', () => {
    describe('Writable Store', () => {
        let store;
        
        beforeEach(() => {
            store = writable({ count: 0, items: [] });
        });

        it('should initialize with default value', () => {
            const value = get(store);
            expect(value).toEqual({ count: 0, items: [] });
        });

        it('should update value with set', () => {
            store.set({ count: 5, items: ['a', 'b'] });
            
            const value = get(store);
            expect(value.count).toBe(5);
            expect(value.items).toEqual(['a', 'b']);
        });

        it('should update value with update function', () => {
            store.update(state => ({
                ...state,
                count: state.count + 1,
                items: [...state.items, 'new']
            }));
            
            const value = get(store);
            expect(value.count).toBe(1);
            expect(value.items).toContain('new');
        });

        it('should notify subscribers', () => {
            const subscriber = vi.fn();
            const unsubscribe = store.subscribe(subscriber);
            
            expect(subscriber).toHaveBeenCalledTimes(1);
            expect(subscriber).toHaveBeenCalledWith({ count: 0, items: [] });
            
            store.set({ count: 10, items: ['x'] });
            
            expect(subscriber).toHaveBeenCalledTimes(2);
            expect(subscriber).toHaveBeenLastCalledWith({ count: 10, items: ['x'] });
            
            unsubscribe();
        });

        it('should stop notifying after unsubscribe', () => {
            const subscriber = vi.fn();
            const unsubscribe = store.subscribe(subscriber);
            
            unsubscribe();
            store.set({ count: 20, items: [] });
            
            // Only initial call
            expect(subscriber).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple subscribers', () => {
            const sub1 = vi.fn();
            const sub2 = vi.fn();
            
            const unsub1 = store.subscribe(sub1);
            const unsub2 = store.subscribe(sub2);
            
            store.set({ count: 5, items: [] });
            
            expect(sub1).toHaveBeenCalledTimes(2);
            expect(sub2).toHaveBeenCalledTimes(2);
            
            unsub1();
            store.set({ count: 10, items: [] });
            
            expect(sub1).toHaveBeenCalledTimes(2); // Not called again
            expect(sub2).toHaveBeenCalledTimes(3); // Still subscribed
            
            unsub2();
        });
    });

    describe('Readable Store', () => {
        it('should create a readable store with initial value', () => {
            const store = readable('initial value');
            
            const value = get(store);
            expect(value).toBe('initial value');
        });

        it('should create a readable store with start function', () => {
            let intervalId;
            const store = readable(0, (set) => {
                let count = 0;
                intervalId = setInterval(() => {
                    set(++count);
                }, 100);
                
                return () => clearInterval(intervalId);
            });
            
            const values = [];
            const unsubscribe = store.subscribe(value => values.push(value));
            
            // Initial value
            expect(values).toEqual([0]);
            
            // Cleanup
            unsubscribe();
            clearInterval(intervalId);
        });
    });

    describe('Derived Store', () => {
        it('should derive from single store', () => {
            const count = writable(5);
            const doubled = derived(count, $count => $count * 2);
            
            expect(get(doubled)).toBe(10);
            
            count.set(7);
            expect(get(doubled)).toBe(14);
        });

        it('should derive from multiple stores', () => {
            const firstName = writable('John');
            const lastName = writable('Doe');
            const fullName = derived(
                [firstName, lastName],
                ([$firstName, $lastName]) => `${$firstName} ${$lastName}`
            );
            
            expect(get(fullName)).toBe('John Doe');
            
            firstName.set('Jane');
            expect(get(fullName)).toBe('Jane Doe');
            
            lastName.set('Smith');
            expect(get(fullName)).toBe('Jane Smith');
        });

        it('should support async derived stores', () => {
            const input = writable('test');
            const processed = derived(
                input,
                ($input, set) => {
                    // Simulate async operation
                    setTimeout(() => {
                        set($input.toUpperCase());
                    }, 0);
                },
                'initial' // Initial value while async operation completes
            );
            
            expect(get(processed)).toBe('initial');
            
            // Wait for async operation
            return new Promise(resolve => {
                setTimeout(() => {
                    expect(get(processed)).toBe('TEST');
                    resolve();
                }, 10);
            });
        });

        it('should notify subscribers of derived changes', () => {
            const base = writable(10);
            const squared = derived(base, $base => $base * $base);
            
            const subscriber = vi.fn();
            const unsubscribe = squared.subscribe(subscriber);
            
            expect(subscriber).toHaveBeenCalledWith(100);
            
            base.set(5);
            expect(subscriber).toHaveBeenCalledWith(25);
            
            base.set(0);
            expect(subscriber).toHaveBeenCalledWith(0);
            
            expect(subscriber).toHaveBeenCalledTimes(3);
            
            unsubscribe();
        });
    });

    describe('Store Patterns', () => {
        it('should implement custom store with validation', () => {
            function createValidatedStore(initialValue, validator) {
                const { subscribe, set, update } = writable(initialValue);
                
                return {
                    subscribe,
                    set: (value) => {
                        if (validator(value)) {
                            set(value);
                        } else {
                            console.error('Validation failed');
                        }
                    },
                    update: (fn) => {
                        update(current => {
                            const newValue = fn(current);
                            return validator(newValue) ? newValue : current;
                        });
                    }
                };
            }
            
            const positiveNumberStore = createValidatedStore(
                0,
                value => typeof value === 'number' && value >= 0
            );
            
            positiveNumberStore.set(10);
            expect(get(positiveNumberStore)).toBe(10);
            
            positiveNumberStore.set(-5); // Should fail validation
            expect(get(positiveNumberStore)).toBe(10); // Unchanged
            
            positiveNumberStore.update(n => n + 5);
            expect(get(positiveNumberStore)).toBe(15);
        });

        it('should implement store with side effects', () => {
            const sideEffect = vi.fn();
            
            function createStoreWithSideEffects(initialValue) {
                const store = writable(initialValue);
                
                return {
                    ...store,
                    set: (value) => {
                        store.set(value);
                        sideEffect(value);
                    }
                };
            }
            
            const store = createStoreWithSideEffects('initial');
            
            store.set('updated');
            expect(get(store)).toBe('updated');
            expect(sideEffect).toHaveBeenCalledWith('updated');
        });

        it('should implement store with persistence', () => {
            const mockStorage = {
                getItem: vi.fn(),
                setItem: vi.fn()
            };
            
            function createPersistedStore(key, initialValue) {
                // Try to load from storage
                const stored = mockStorage.getItem(key);
                const initial = stored ? JSON.parse(stored) : initialValue;
                
                const store = writable(initial);
                
                // Save to storage on change
                store.subscribe(value => {
                    mockStorage.setItem(key, JSON.stringify(value));
                });
                
                return store;
            }
            
            const store = createPersistedStore('test-key', { count: 0 });
            
            expect(mockStorage.getItem).toHaveBeenCalledWith('test-key');
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'test-key',
                JSON.stringify({ count: 0 })
            );
            
            store.set({ count: 5 });
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                'test-key',
                JSON.stringify({ count: 5 })
            );
        });

        it('should implement store with history', () => {
            function createHistoryStore(initialValue) {
                const history = [initialValue];
                let currentIndex = 0;
                const store = writable(initialValue);
                
                return {
                    subscribe: store.subscribe,
                    set: (value) => {
                        history.splice(currentIndex + 1);
                        history.push(value);
                        currentIndex++;
                        store.set(value);
                    },
                    undo: () => {
                        if (currentIndex > 0) {
                            currentIndex--;
                            store.set(history[currentIndex]);
                        }
                    },
                    redo: () => {
                        if (currentIndex < history.length - 1) {
                            currentIndex++;
                            store.set(history[currentIndex]);
                        }
                    },
                    canUndo: () => currentIndex > 0,
                    canRedo: () => currentIndex < history.length - 1
                };
            }
            
            const store = createHistoryStore('initial');
            
            store.set('second');
            store.set('third');
            
            expect(get(store)).toBe('third');
            
            store.undo();
            expect(get(store)).toBe('second');
            
            store.undo();
            expect(get(store)).toBe('initial');
            
            expect(store.canUndo()).toBe(false);
            
            store.redo();
            expect(get(store)).toBe('second');
            
            store.set('new branch');
            expect(store.canRedo()).toBe(false);
        });
    });

    describe('Store Memory Management', () => {
        it('should clean up subscriptions properly', () => {
            const store = writable(0);
            const subscribers = [];
            
            // Create many subscriptions
            for (let i = 0; i < 100; i++) {
                const unsubscribe = store.subscribe(() => {});
                subscribers.push(unsubscribe);
            }
            
            // Unsubscribe all
            subscribers.forEach(unsub => unsub());
            
            // Store should still work
            const newSubscriber = vi.fn();
            const unsubscribe = store.subscribe(newSubscriber);
            
            store.set(42);
            expect(newSubscriber).toHaveBeenCalledWith(42);
            
            unsubscribe();
        });

        it('should handle rapid updates efficiently', () => {
            const store = writable(0);
            const subscriber = vi.fn();
            
            store.subscribe(subscriber);
            
            // Rapid updates
            for (let i = 1; i <= 1000; i++) {
                store.set(i);
            }
            
            // Should have been called for each update + initial
            expect(subscriber).toHaveBeenCalledTimes(1001);
            expect(subscriber).toHaveBeenLastCalledWith(1000);
        });
    });
});