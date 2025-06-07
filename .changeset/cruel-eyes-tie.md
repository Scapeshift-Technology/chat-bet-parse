---
'chat-bet-parse': minor
---

Add SQL Server grading client and expand parser support

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
