# Development Workflow Management

## Core Development Loop

### Feature Development Workflow
```
FOR each feature request:
  1. REQUIREMENTS_ANALYSIS:
     IF requirements unclear:
       REQUEST clarification from user
       WAIT for response
       GOTO REQUIREMENTS_ANALYSIS
     END IF
     
  2. DESIGN_PHASE:
     READ relevant module CLAUDE.md files
     IF cross-module feature:
       READ project root CLAUDE.md
       CHECK integration patterns
     END IF
     CREATE technical plan
     
  3. IMPLEMENTATION_LOOP:
     WHILE feature incomplete:
       a. CODE_IMPLEMENTATION:
          WRITE code following established patterns
          
       b. STANDARDS_VERIFICATION:
          RUN context7 compliance check
          IF standards violated:
            IDENTIFY violation patterns
            CORRECT code to match existing patterns
            UPDATE relevant CLAUDE.md if pattern needs clarification
            GOTO STANDARDS_VERIFICATION
          END IF
          
       c. QUALITY_GATE_CHECK:
          IF module has existing tests:
            RUN test suite
            IF tests fail:
              FIX issues
              GOTO QUALITY_GATE_CHECK
            END IF
          END IF
          
       d. INTEGRATION_VERIFICATION:
          IF cross-module feature:
            CHECK compatibility with other modules
            VERIFY data flow consistency
            IF integration issues:
              RESOLVE conflicts
              GOTO INTEGRATION_VERIFICATION
            END IF
          END IF
          
       e. API_DATABASE_VALIDATION:
          IF API endpoint created/modified:
            VERIFY database connection pattern (new Database() per request)
            CHECK await db.connect() before queries
            CONFIRM await db.close() in finally block
            VALIDATE error handling for connection failures
            ADD console.log for debugging without manual inspection
            IF database pattern issues:
              FIX connection lifecycle
              GOTO API_DATABASE_VALIDATION
            END IF
          END IF
          
     END WHILE
     
  4. COMPLETION_VERIFICATION:
     RUN full system validation
     UPDATE relevant CLAUDE.md files with new patterns
     UPDATE this workflow.md with any process improvements
     MARK feature complete
     
END FOR
```

## Process Improvement Loop

### Self-Optimization Cycle
```
AFTER each feature completion:
  1. PATTERN_ANALYSIS:
     IDENTIFY what worked well
     IDENTIFY what caused delays/issues
     
  2. TEMPLATE_UPDATES:
     IF new reusable pattern discovered:
       ADD to templates.md
     END IF
     
  3. WORKFLOW_REFINEMENT:
     IF process inefficiency identified:
       UPDATE this workflow.md
       NOTIFY user of improvement
     END IF
     
  4. STANDARDS_EVOLUTION:
     IF code pattern needs standardization:
       UPDATE standards.md
       UPDATE relevant module CLAUDE.md
     END IF
```

## Context Switching Management

### Module Work Protocol
```
WHEN working on specific module:
  1. READ_CONTEXT:
     LOAD global CLAUDE.md (personal preferences)
     LOAD project root CLAUDE.md (coordination rules)
     LOAD specific module CLAUDE.md (module patterns)
     
  2. CONTEXT_VERIFICATION:
     CHECK for conflicting instructions
     IF conflicts found:
       FLAG to user immediately
       REQUEST clarification
       WAIT for resolution
     END IF
     
  3. WORK_EXECUTION:
     FOLLOW established patterns
     MAINTAIN consistency with existing code
     
  4. CONTEXT_UPDATE:
     IF new patterns emerge:
       UPDATE appropriate CLAUDE.md
       VERIFY no conflicts created
     END IF
```

## Error Recovery Protocols

### Standards Violation Recovery
```
WHEN standards violation detected:
  1. VIOLATION_ANALYSIS:
     IDENTIFY specific pattern mismatch
     LOCATE correct pattern in CLAUDE.md files
     
  2. CORRECTION_STRATEGY:
     IF simple fix:
       APPLY correction immediately
     ELSE IF architectural issue:
       REDESIGN approach
       VERIFY with user if major change
     END IF
     
  3. PREVENTION_UPDATE:
     ADD violation pattern to standards.md
     UPDATE quality gates to catch similar issues
```

## Progress Tracking

### Feature Status States
- **PLANNED**: Requirements clear, design pending
- **IN_PROGRESS**: Active development
- **STANDARDS_REVIEW**: Code complete, checking compliance
- **TESTING**: Running quality gates
- **INTEGRATION_CHECK**: Verifying cross-module compatibility
- **COMPLETE**: All gates passed, documentation updated

### Workflow Metrics
- **Time per phase**: Track efficiency bottlenecks
- **Standards violations**: Monitor pattern compliance
- **Rework cycles**: Identify improvement opportunities
- **Pattern reuse**: Measure template effectiveness

## Explicit Update Protocol

### After Every Turn Requirements
```
END_OF_TURN_UPDATES:
  1. ANNOUNCE_MEMORY_STORAGE:
     IF personal preference learned:
       ANNOUNCE "🧠 STORING PERSONAL PREFERENCE: [description] → Global CLAUDE.md"
     END IF
     IF module pattern discovered:
       ANNOUNCE "🔧 STORING MODULE PATTERN: [description] → [module]/CLAUDE.md"
     END IF
     IF project rule established:
       ANNOUNCE "🏗️ STORING PROJECT RULE: [description] → Project CLAUDE.md"
     END IF
     
  2. UPDATE_PM_FILES:
     ANNOUNCE "📝 UPDATE PM FILES: [list of files being updated]"
     UPDATE relevant PM files with new insights
     
  3. METRICS_UPDATE:
     CALCULATE current project health changes
     ANNOUNCE "📊 METRICS: [key changes and current status]"
     
  4. CONFLICT_DETECTION:
     IF memory conflicts detected:
       ANNOUNCE "⚠️ MEMORY CONFLICT DETECTED: [details]"
       REQUEST clarification from user
     END IF
     
  5. SUMMARY_ANNOUNCEMENT:
     PROVIDE comprehensive update summary using standard format
```

### Memory Conflict Resolution
```
WHEN conflict detected:
  1. PAUSE current work
  2. ANNOUNCE conflict explicitly
  3. PRESENT both conflicting instructions
  4. ASK user which takes precedence
  5. UPDATE memory accordingly
  6. RESUME work with clarified instruction
```

## Current Project Status
- **Project**: Kranos Gym Management System  
- **Phase**: Troubleshooting UI/Database Integration Issues
- **Active Issue**: Member Details Modal not displaying membership data despite populated database
- **Recent Work**: Fixed API database connection pattern, issue persists
- **Next**: Continue investigation in next session with enhanced debugging

## Latest Updates Applied
- **Memory Protocol**: Explicit announcement system implemented
- **PM Tracking**: Turn-by-turn update requirements established
- **Conflict Detection**: Proactive conflict identification and resolution
- **Update Format**: Standardized announcement format for consistency
- **Database Troubleshooting**: Added API connection validation to workflow
- **Quality Gates**: Enhanced with database connection pattern checks