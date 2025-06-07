# chat-bet-parse

## 0.3.0

### Minor Changes

- 354c740: Add SQL Server grading client and expand parser support

  ### 🏗️ New Features

  - **SQL Server Grading Client**: New `ChatBetGradingClient` for automated contract grading against SQL Server databases
    - Support for all major contract types: TotalPoints, TotalPointsContestant, HandicapContestantML, HandicapContestantLine
    - Comprehensive error handling with `GradingConnectionError` and `GradingDataError`
    - Flexible configuration with connection pooling options
    - Factory functions for easy client creation
  - **Enhanced Parser Support**: Extended parsing capabilities for F3 periods and individual player props
    - F3 (first three innings) period parsing for baseball games
    - Individual player detection for props (e.g., "B. Name Ks o1.5")
    - Improved team name handling with special characters

## 0.2.0

### Minor Changes

- 744258e: Initial release of chat-bet-parse

  - 🏈 Multi-sport support (MLB, NBA) with extensible framework
  - 📝 Rich parsing for chat orders (IW) and fills (YG) with different size interpretations
  - 🔒 Full TypeScript support with discriminated unions
  - 🗃️ SQL Server ready types for stored procedure integration
  - ⚡ Zero runtime dependencies
  - 🧪 Comprehensive test suite with 141 tests and 100% coverage
  - 📖 Complete EBNF grammar documentation
  - ✅ README validation tests to ensure documentation accuracy
