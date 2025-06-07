# Chat-Bet-Parse Grading System

This module provides SQL Server integration for grading parsed chat betting contracts. It connects to Scapeshift's licensed SQL Server database to evaluate betting contract outcomes and return win/loss/push/ungraded results.

## Overview

The grading system takes a `ParseResult` from the main parsing functionality and connects to a SQL Server database to determine the actual outcome of the bet. It supports all contract types handled by the parser:

- **Game Totals** (TotalPoints): Over/under bets on total points scored in a game/period
- **Team Totals** (TotalPointsContestant): Over/under bets on points scored by a specific team
- **Moneylines** (HandicapContestantML): Straight win/loss bets on a team
- **Spreads** (HandicapContestantLine): Point spread bets with handicap lines
- **Props Over/Under** (PropOU): Proposition bets with over/under lines (e.g., player stats)
- **Props Yes/No** (PropYN): Proposition bets with yes/no outcomes (e.g., first to score)
- **Series** (Series): Multi-game series outcome bets

## Prerequisites

⚠️ **Important**: This functionality is only available with a licensed connection to Scapeshift's SQL Server database. The required stored procedures, tables, and data are not available on other databases.

## Installation

The grading functionality is included with the main package:

```bash
npm install chat-bet-parse
```

Additional dependency for SQL Server connectivity:

```bash
npm install mssql
```

## Quick Start

```typescript
import { parseChat, ChatBetGradingClient } from 'chat-bet-parse';

// Initialize the grading client
const gradingClient = new ChatBetGradingClient(
  'Server=your-server;Database=your-db;User Id=your-user;Password=your-password;'
);

// Test the connection
try {
  await gradingClient.testConnection();
  console.log('Connected to SQL Server successfully');
} catch (error) {
  console.error('Connection failed:', error.message);
}

// Parse a chat message
const parseResult = parseChat('YG Padres/Pirates 1st inning u0.5 @ +100 = 0.094');

// Grade the parsed result
try {
  const grade = await gradingClient.grade(parseResult);
  console.log('Grade:', grade); // 'W', 'L', 'P', or '?'
} catch (error) {
  console.error('Grading failed:', error.message);
}

// Clean up
await gradingClient.close();
```

## API Reference

### ChatBetGradingClient

The main class for grading functionality.

#### Constructor

```typescript
new ChatBetGradingClient(config: string | GradingClientConfig)
```

**Parameters:**

- `config`: Either a connection string or a full configuration object

**Connection String Format:**

```
Server=server-name;Database=database-name;User Id=username;Password=password;Encrypt=true;
```

**Configuration Object:**

```typescript
interface GradingClientConfig {
  connectionString: string;
  pool?: {
    max?: number; // Max connections (default: 10)
    min?: number; // Min connections (default: 0)
    idleTimeoutMillis?: number; // Idle timeout (default: 30000)
    acquireTimeoutMillis?: number; // Acquire timeout (default: 60000)
  };
  requestTimeout?: number; // Request timeout (default: 30000)
  connectionTimeout?: number; // Connection timeout (default: 15000)
}
```

#### Methods

##### `async testConnection(): Promise<void>`

Tests the database connection. Throws `GradingConnectionError` if connection fails.

##### `async grade(result: ParseResult): Promise<GradeResult>`

Grades a parsed chat result and returns the outcome.

**Parameters:**

- `result`: A `ParseResult` from `parseChat()`, `parseChatOrder()`, or `parseChatFill()`

**Returns:**

- `'W'`: Win
- `'L'`: Loss
- `'P'`: Push (tie)
- `'?'`: Unable to grade (missing data, game not finished, etc.)

**Throws:**

- `GradingConnectionError`: Database connection issues
- `GradingQueryError`: SQL execution errors
- `GradingDataError`: Invalid or insufficient contract data

##### `isConnected(): boolean`

Returns current connection status.

##### `async close(): Promise<void>`

Closes the database connection and cleans up resources.

### Factory Functions

```typescript
// Simple connection string
const client = createGradingClient(connectionString);

// Full configuration
const client = createGradingClientWithConfig({
  connectionString: '...',
  pool: { max: 20 },
  requestTimeout: 45000,
});
```

## Error Handling

The grading system provides specific error types for different failure scenarios:

```typescript
import {
  GradingError,
  GradingConnectionError,
  GradingQueryError,
  GradingDataError,
} from 'chat-bet-parse';

try {
  const grade = await client.grade(result);
} catch (error) {
  if (error instanceof GradingConnectionError) {
    console.error('Database connection issue:', error.message);
  } else if (error instanceof GradingQueryError) {
    console.error('SQL execution error:', error.message);
  } else if (error instanceof GradingDataError) {
    console.error('Invalid contract data:', error.message);
  }
}
```

## Grading Logic

### Game Totals & Team Totals

Compares actual points scored against the line:

- **Win**: Actual score beats the line in the predicted direction
- **Loss**: Actual score loses against the line
- **Push**: Actual score exactly equals the line

### Moneylines

Simple win/loss based on which team scored more points:

- **Win**: Selected team scores more points
- **Loss**: Selected team scores fewer points
- **Push/Tie**: Teams score equal points (handling depends on `TiesLose` setting)

### Spreads

Team performance adjusted by the spread line:

- **Win**: Team + spread > opponent's score
- **Loss**: Team + spread < opponent's score
- **Push**: Team + spread = opponent's score

### Series

Multi-game outcomes based on wins in a series:

- **Win**: Selected team wins majority of games in series
- **Loss**: Selected team loses majority of games in series
- Requires all games in series to be completed

### Props

Proposition bet outcomes (simplified implementation):

- **PropOU**: Based on actual statistical performance vs. line
- **PropYN**: Based on whether the event occurred

## Database Schema Integration

The grading system integrates with several SQL Server tables and functions:

### Key Tables

- `SportCompetition_Match`: Match information and scheduling
- `SportCompetition_Contestant_TeamLeague`: Team participation in matches
- `LeagueTeam_Franchise` / `LeagueTeam_FranchiseAlias`: Team name resolution
- `MatchFinalBoxScore`: Actual game scoring data
- `SportCompetition_MatchSeries`: Series length and structure

### Key Functions

- `LeaguePeriodShortcode_GET_BoxTotalPoints_fn`: Retrieves actual points scored
- `SportCompetition_Match_DaySequence_Get_fn`: Handles game numbering (G2, #2, etc.)

### Master Grading Function

The system uses a single SQL Server function `Contract_CALCULATE_Grade_fn` that:

1. Identifies the match using date and team names
2. Resolves team aliases and franchise names
3. Retrieves actual scoring data for the specified period
4. Applies contract-specific grading logic
5. Returns 'W', 'L', 'P', or '?' result

The function accepts these contestant types:

- **Individual**: Individual competitors (e.g., tennis players, golfers)
- **TeamAdHoc**: Teams that register to play a single event together (e.g., doubles tennis pairs)
- **TeamLeague**: Teams that play together as a unit across multiple events (e.g., MLB teams, NBA teams)

## Performance Considerations

### Connection Pooling

The client uses connection pooling by default to minimize connection overhead:

- Pools are shared across multiple grading operations
- Connections are automatically managed and recycled
- Configurable pool size and timeout settings

### Query Optimization

- Single SQL function call per grade operation
- Efficient team name resolution using indexes
- Minimal data transfer (single character result)

### Error Recovery

- Automatic connection retry on transient failures
- Graceful degradation when game data is unavailable
- Connection state validation before each operation

## Best Practices

### Resource Management

```typescript
// Always close connections when done
const client = new ChatBetGradingClient(connectionString);
try {
  // ... grading operations
} finally {
  await client.close();
}

// Or use a long-lived client for multiple operations
const client = new ChatBetGradingClient(connectionString);
// ... many grading operations over time
process.on('beforeExit', () => client.close());
```

### Error Handling

```typescript
async function gradeWithRetry(client: ChatBetGradingClient, result: ParseResult, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.grade(result);
    } catch (error) {
      if (error instanceof GradingConnectionError && attempt < maxRetries) {
        console.log(`Connection failed, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

### Batch Operations

```typescript
async function gradeMultiple(client: ChatBetGradingClient, results: ParseResult[]) {
  const grades = await Promise.all(
    results.map(async result => {
      try {
        return await client.grade(result);
      } catch (error) {
        console.error(`Failed to grade result:`, error.message);
        return '?';
      }
    })
  );
  return grades;
}
```

## Limitations

1. **Database Dependency**: Requires access to Scapeshift's specific SQL Server database
2. **Prop Implementation**: Prop grading is simplified and may need enhancement for specific prop types
3. **Real-time Data**: Grading depends on game data being updated in the database
4. **Network Latency**: Database calls introduce latency compared to local parsing
5. **Series Completion**: Series grading requires all games to be completed

## Troubleshooting

### Common Issues

**Connection Timeouts**

```typescript
const client = new ChatBetGradingClient({
  connectionString: '...',
  connectionTimeout: 30000, // Increase timeout
  requestTimeout: 60000, // Increase request timeout
});
```

**Grade Returns '?'**

- Match not found (check team names and date)
- Game data not yet available
- Invalid contract parameters
- Series not yet complete

**Memory Leaks**

- Always call `client.close()` when done
- Use connection pooling appropriately
- Monitor connection pool metrics

### Debug Information

Enable SQL debugging in development:

```typescript
// Note: This would require additional configuration in a real implementation
const client = new ChatBetGradingClient({
  connectionString: '...',
  // debug: true  // Would enable SQL query logging
});
```

## License

This grading functionality is part of the chat-bet-parse package and follows the same MIT license terms.
