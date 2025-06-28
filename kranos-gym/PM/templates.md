# Reusable Project Templates & Patterns

## Perfect Project Setup Template

### Initial Project Structure
```
project-name/
├── PM/                           # Project Management
│   ├── workflow.md              # Development loops & processes
│   ├── standards.md             # Code standards & context7
│   ├── quality-gates.md         # Quality checkpoints
│   ├── success-metrics.md       # KPIs & tracking
│   └── templates.md             # This file
├── CLAUDE.md                    # Project coordination
├── src/
│   ├── lib/
│   │   ├── components/CLAUDE.md # UI patterns
│   │   ├── db/CLAUDE.md         # Database patterns
│   │   └── stores/CLAUDE.md     # State management
│   └── routes/CLAUDE.md         # Route patterns
└── CHANGELOG.md                 # Feature tracking
```

### Memory Management Setup
```
STEP 1: Global Memory
  CREATE /Users/[user]/.claude/CLAUDE.md
  ADD proactive memory management rules
  DEFINE personal preferences storage

STEP 2: Project Memory
  CREATE project root CLAUDE.md
  DEFINE cross-module coordination rules
  ESTABLISH integration patterns

STEP 3: Module Memory
  FOR each major module:
    CREATE module-specific CLAUDE.md
    DOCUMENT patterns and standards
    ESTABLISH reference implementations
```

## Development Pattern Templates

### Feature Development Template
```
FEATURE: [Feature Name]
PHASE: [Planning|Development|Testing|Complete]

REQUIREMENTS:
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Edge case handling

DESIGN:
- Module: [target module]
- Patterns: [reference patterns to follow]
- Integration: [cross-module dependencies]

IMPLEMENTATION:
- [ ] Standards compliance check
- [ ] Quality gates passed
- [ ] Documentation updated
- [ ] Context7 verification

VERIFICATION:
- [ ] Functional testing
- [ ] Integration testing
- [ ] User acceptance
- [ ] Performance validation
```

### Module Creation Template
```
MODULE: [Module Name]
PURPOSE: [What this module handles]

STRUCTURE:
[module-name]/
├── CLAUDE.md              # Module-specific patterns
├── [core-file].js         # Main implementation
├── [helper-file].js       # Supporting functions
└── tests/                 # Module tests

PATTERNS:
- [ ] Naming conventions defined
- [ ] Error handling approach documented
- [ ] Integration patterns established
- [ ] Reference implementations created

STANDARDS:
- [ ] Context7 reference files identified
- [ ] Verification checklist created
- [ ] Quality gates configured
- [ ] Success metrics defined
```

### Code Pattern Templates

#### Database Module Template
```javascript
// Database operation pattern
class ModuleDatabase {
    async connect() {
        // Singleton connection with race protection
    }
    
    async operation(params) {
        await this.ensureConnection();
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }
    
    async close() {
        // Proper cleanup
    }
}
```

#### Component Validation Template
```javascript
// Form validation pattern
function validateForm(formData) {
    const errors = {};
    
    // Required field validation
    const field = formData.get('field');
    if (!field || !field.trim()) {
        errors.field = 'Field is required';
    }
    
    // Pattern validation
    if (field && !/pattern/.test(field)) {
        errors.field = 'Invalid format';
    }
    
    return errors;
}

const submitForm = () => {
    return async ({ formData, result }) => {
        const errors = validateForm(formData);
        if (Object.keys(errors).length > 0) {
            formErrors = errors;
            return;
        }
        
        isLoading = true;
        formErrors = {};
        
        // Handle result processing
        if (result.type === 'success') {
            if (result.data?.success === false) {
                handleServerErrors(result.data.error);
            } else {
                showSuccess('Operation successful!');
                closeModal();
                await invalidateAll();
            }
        }
        
        isLoading = false;
    };
};
```

#### Server Action Template
```javascript
export const actions = {
    action: async ({ request }) => {
        const db = new Database();
        const formData = await request.formData();
        
        const data = {
            field1: formData.get('field1'),
            field2: formData.get('field2')
        };
        
        try {
            await db.connect();
            const result = await db.operation(data);
            return { success: true, data: result };
        } catch (error) {
            console.error('Operation error:', error.message);
            return { success: false, error: 'User-friendly message' };
        } finally {
            await db.close();
        }
    }
};
```

## Quality Assurance Templates

### Quality Gate Checklist Template
```
QUALITY GATE: [Gate Name]
TRIGGER: [When to execute]

CHECKS:
- [ ] Standards compliance verified
- [ ] Pattern consistency maintained
- [ ] Error handling implemented
- [ ] Integration points validated
- [ ] Documentation updated

PASS CRITERIA:
- Zero critical violations
- Max X warning violations
- All functional requirements met

FAIL ACTIONS:
1. Identify specific violations
2. Reference correct patterns
3. Apply corrections
4. Re-run verification
```

### Code Review Template
```
CODE REVIEW: [Feature/Module]
REVIEWER: Claude (Automated)

STANDARDS COMPLIANCE:
- [ ] Naming conventions followed
- [ ] Architecture patterns maintained
- [ ] Error handling consistent
- [ ] Integration approaches valid

QUALITY ASSESSMENT:
- [ ] Code readable and maintainable
- [ ] Performance considerations addressed
- [ ] Security best practices followed
- [ ] Documentation adequate

RECOMMENDATIONS:
- [Specific improvement suggestions]
- [Pattern optimization opportunities]
- [Future maintenance considerations]
```

## Success Optimization Templates

### Project Health Dashboard Template
```
PROJECT HEALTH DASHBOARD
Last Updated: [Date]

OVERALL SCORE: [X]% ([GREEN|YELLOW|RED])

METRICS BREAKDOWN:
├── Code Quality: [X]%
│   ├── Standards Compliance: [X]%
│   ├── Technical Debt: [X]%
│   └── Test Coverage: [X]%
├── Delivery Efficiency: [X]%
│   ├── Feature Velocity: [X]%
│   ├── First-Time-Right: [X]%
│   └── Context Switch: [X]%
├── Maintainability: [X]%
│   ├── Pattern Consistency: [X]%
│   ├── Documentation: [X]%
│   └── Comprehensibility: [X]%
└── User Satisfaction: [X]%
    ├── Feature Acceptance: [X]%
    └── Development Experience: [X]%

TRENDS:
- Improving: [List]
- Stable: [List]
- Attention Needed: [List]

ACTIONS:
- [ ] [Specific improvement action]
- [ ] [Pattern update required]
- [ ] [Process optimization]
```

### Learning Capture Template
```
LEARNING: [What was learned]
CONTEXT: [When/where this applies]
IMPACT: [How this improves future work]

PATTERN:
- BEFORE: [Previous approach]
- AFTER: [Improved approach]
- RATIONALE: [Why this is better]

APPLICATION:
- [ ] Update relevant CLAUDE.md
- [ ] Revise templates
- [ ] Adjust quality gates
- [ ] Share with team

VERIFICATION:
- [ ] Test improved approach
- [ ] Measure effectiveness
- [ ] Document results
- [ ] Refine as needed
```

## Future Project Improvements

### Template Evolution Strategy
```
CONTINUOUS_IMPROVEMENT_LOOP:
  AFTER each project:
    1. CAPTURE what worked well
    2. IDENTIFY what could improve
    3. UPDATE templates accordingly
    4. TEST improvements on next project
    5. REFINE based on results
```

### Success Pattern Library
```
PATTERN_LIBRARY_GROWTH:
  SUCCESSFUL_APPROACHES:
    - [List of proven patterns]
    - [Reusable components]
    - [Effective workflows]
  
  ANTI_PATTERNS:
    - [Approaches that failed]
    - [Common pitfalls]
    - [Prevention strategies]
```

### Replication Checklist
```
NEW_PROJECT_SETUP:
- [ ] Copy PM/ directory structure
- [ ] Initialize global CLAUDE.md rules
- [ ] Create project root CLAUDE.md
- [ ] Set up module-specific CLAUDE.md files
- [ ] Configure quality gates
- [ ] Establish success metrics
- [ ] Initialize templates
- [ ] Begin development workflow

CUSTOMIZATION:
- [ ] Adapt patterns to project technology
- [ ] Adjust quality thresholds
- [ ] Modify workflows for team size
- [ ] Configure metrics for project type
```

## Current Template Status
- **Core Templates**: Complete (5 PM files)
- **Pattern Templates**: 85% complete
- **Quality Templates**: 90% complete
- **Success Templates**: 80% complete
- **Replication Guide**: 95% complete

**Next Evolution**: After 3 more projects completed
**Focus**: Pattern library expansion, automation integration