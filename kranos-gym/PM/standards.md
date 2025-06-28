# Code Standards Verification System

## Context7 Integration Protocol

### Automated Standards Verification
```
FUNCTION verifyCodeStandards(newCode, moduleType):
  1. LOAD_REFERENCE_PATTERNS:
     contextFiles = []
     ADD relevant module CLAUDE.md to contextFiles
     ADD 3-5 similar existing files to contextFiles
     ADD project root CLAUDE.md to contextFiles
     
  2. PATTERN_ANALYSIS:
     FOR each pattern in contextFiles:
       CHECK naming conventions match
       CHECK structure patterns match
       CHECK validation patterns match
       CHECK error handling patterns match
     END FOR
     
  3. VIOLATION_DETECTION:
     violations = []
     IF naming inconsistent:
       ADD "naming_violation" to violations
     END IF
     IF structure differs:
       ADD "structure_violation" to violations  
     END IF
     IF validation missing:
       ADD "validation_violation" to violations
     END IF
     
  4. COMPLIANCE_REPORT:
     IF violations.length > 0:
       RETURN failure with specific violations
     ELSE:
       RETURN success
     END IF
```

## Module-Specific Standards

### Database Module Standards (`/src/lib/db/`)
**Reference Files for Context7**:
- `database.js` (primary pattern reference)
- `migrate.js` (migration patterns)
- Relevant CLAUDE.md: `/src/lib/db/CLAUDE.md`

**Verification Checklist**:
- [ ] Connection management follows singleton pattern
- [ ] Parameterized queries used (no string concatenation)
- [ ] Proper error handling with user-friendly messages
- [ ] Soft delete patterns where applicable
- [ ] Promise-based async operations

### Components Module Standards (`/src/lib/components/`)
**Reference Files for Context7**:
- `Modal.svelte` (base component pattern)
- `MemberDetailsModal.svelte` (specialized component)
- Form validation examples from routes
- Relevant CLAUDE.md: `/src/lib/components/CLAUDE.md`

**Verification Checklist**:
- [ ] Custom JavaScript validation only (no HTML5)
- [ ] Real-time error clearing on input
- [ ] Consistent CSS class naming
- [ ] Theme CSS variables usage
- [ ] Proper accessibility attributes

### Routes Module Standards (`/src/routes/`)
**Reference Files for Context7**:
- `members/+page.svelte` (comprehensive page example)
- `members/+page.server.js` (server actions pattern)
- API endpoint pattern from `/api/`
- Relevant CLAUDE.md: `/src/routes/CLAUDE.md`

**Verification Checklist**:
- [ ] SvelteKit `use:enhance` pattern
- [ ] Consistent response format: `{success, data?, error?}`
- [ ] Database connection cleanup in finally blocks
- [ ] Toast notifications for user feedback
- [ ] Form validation before server submission

### Stores Module Standards (`/src/lib/stores/`)
**Reference Files for Context7**:
- `toast.js` (primary store example)
- Store usage examples from components
- Relevant CLAUDE.md: `/src/lib/stores/CLAUDE.md`

**Verification Checklist**:
- [ ] Writable store pattern with custom methods
- [ ] Immutable state updates
- [ ] Cleanup mechanisms for subscriptions
- [ ] Consistent export patterns for convenience

## Standards Enforcement Workflow

### Pre-Implementation Check
```
BEFORE writing new code:
  1. IDENTIFY target module
  2. READ module CLAUDE.md for patterns
  3. EXAMINE 2-3 existing files in module
  4. PLAN implementation following established patterns
```

### During Implementation Check
```
WHILE coding:
  1. COMPARE against reference patterns every 10-15 lines
  2. VERIFY naming follows established conventions
  3. CHECK error handling matches existing approaches
  4. ENSURE validation patterns consistent
```

### Post-Implementation Check
```
AFTER code completion:
  1. RUN full context7 verification
  2. COMPARE with 5-7 similar files
  3. CHECK integration points match expected patterns
  4. VERIFY no new anti-patterns introduced
```

## Pattern Violation Types

### Critical Violations (Must Fix)
- **Security**: SQL injection risks, unvalidated inputs
- **Data Integrity**: Missing validation, incorrect constraints
- **Architecture**: Breaking established patterns
- **Integration**: Incompatible with existing modules

### Warning Violations (Should Fix)
- **Consistency**: Minor naming or style deviations
- **Performance**: Inefficient but functional code
- **Maintainability**: Hard-to-read or complex logic
- **Documentation**: Missing comments on complex logic

### Advisory Violations (Consider Fixing)
- **Optimization**: Potential improvements identified
- **Refactoring**: Code could be simplified
- **Future-proofing**: Patterns that may cause issues later

## Standards Evolution Process

### When to Update Standards
```
IF new pattern emerges frequently:
  ADD to appropriate CLAUDE.md
  UPDATE this standards.md
  NOTIFY user of pattern standardization
END IF

IF existing pattern proves problematic:
  ANALYZE root cause
  PROPOSE pattern improvement
  GET user approval for change
  UPDATE all relevant documentation
END IF
```

### Pattern Documentation Format
```
**Pattern Name**: [Descriptive name]
**Context**: [When to use this pattern]
**Implementation**: [Code example]
**Rationale**: [Why this pattern is preferred]
**Anti-patterns**: [What to avoid]
```

## Current Standards Status
- **Established Patterns**: 15+ documented patterns across 4 modules
- **Verification Coverage**: Database (95%), Components (90%), Routes (85%), Stores (80%)
- **Common Violations**: Naming inconsistencies, missing error handling
- **Next Review**: After next 3 features completed

## Context7 Reference Files Registry
**Last Updated**: Project setup
**Database Module**: 3 reference files
**Components Module**: 4 reference files  
**Routes Module**: 6 reference files
**Stores Module**: 2 reference files
**Coverage**: ~85% of common patterns documented