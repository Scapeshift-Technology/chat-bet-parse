/**
 * chat-bet-parse/types
 *
 * Type-only entry point that exports types and type guards without any Node.js dependencies.
 * Safe to import in browser/renderer contexts (e.g., Electron renderer process).
 *
 * This module only exports:
 * - Type definitions (interfaces, types, enums)
 * - Type guard functions (pure TypeScript functions with no runtime dependencies)
 *
 * This module does NOT export:
 * - Parsing functions (which may have Node.js dependencies)
 * - Database/grading functions (which require mssql)
 * - Tracking functions (which may have Node.js dependencies)
 */

// Export all types and type guards from the types module
export * from './types/index';
