# Medici to Every App Framework - Implementation Plan

This folder contains the implementation plan for porting the Medici expense tracking app to the Every App framework.

## Overview

**Medici** is a self-hostable, privacy-first alternative to Splitwise for managing group expenses.

### What We're Porting

**Core Features:**

- Expense pools (groups for splitting expenses)
- Expenses with split methods (percentage, amount, default)
- 25 expense categories with auto-categorization rules
- Friends and friend requests
- Balance computation with debt simplification (Ford-Fulkerson)
- Pool settle-up functionality
- Spending analytics

### Technology Migration

| Aspect   | Medici (Current)            | Every App (Target)                    |
| -------- | --------------------------- | ------------------------------------- |
| Frontend | React + TanStack Router     | TanStack Start (same router, but SSR) |
| API      | openapi-fetch + react-query | Server Functions + TanStack DB        |
| Backend  | Rust/Axum                   | TypeScript Server Functions           |
| Database | PostgreSQL + Diesel         | SQLite (D1) + Drizzle                 |
| Auth     | JWT (self-managed)          | Embedded SDK (handled by parent)      |

## Implementation Phases

1. [Phase 1: Frontend Conversion](./phase-1-frontend.md) - TanStack Start with mocked backend
2. [Phase 2: Database Schema](./phase-2-database.md) - Drizzle + Cloudflare D1
3. [Phase 3: Backend Implementation](./phase-3-backend.md) - Server functions + auth removal

## Recommended Implementation Order

1. **Phase 1a**: Create types/schemas + delete todo files
2. **Phase 1b**: Create TanStack DB collections with mock data
3. **Phase 1c**: Port UI components (PoolSummary, ExpenseCard, etc.)
4. **Phase 1d**: Wire up routes with mocked server functions
5. **Phase 2**: Replace schema.ts, generate migrations
6. **Phase 3a**: Create repositories + services
7. **Phase 3b**: Replace mock server functions with real implementations
8. **Phase 3c**: Port balance calculation algorithm
9. **Phase 3d**: Test end-to-end
