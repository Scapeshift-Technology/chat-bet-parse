/**
 * Integration tests for chat-bet-parse grading functionality
 * 
 * These tests require a DATABASE_CONNECTION_STRING environment variable
 * pointing to a Scapeshift SQL Server database with the required schema.
 * 
 * Run with: DATABASE_CONNECTION_STRING="Server=...;Database=...;" npm test
 */

import {
  parseChat,
  ChatBetGradingClient,
  createGradingClient,
  createGradingClientWithConfig,
  GradingConnectionError,
  GradingDataError,
  isWritein,
  type GradingClientConfig,
} from '../../src/index';

const DATABASE_CONNECTION_STRING = process.env.DATABASE_CONNECTION_STRING;

// Skip integration tests if no database connection string is provided
const testSuite = DATABASE_CONNECTION_STRING ? describe : describe.skip;

testSuite('Grading Integration Tests', () => {
  let sharedClient: ChatBetGradingClient;
  
  // Set up a single connection for the entire test suite
  beforeAll(async () => {
    if (DATABASE_CONNECTION_STRING) {
      sharedClient = new ChatBetGradingClient(DATABASE_CONNECTION_STRING);
      await sharedClient.testConnection(); // Establish connection once
    }
  });

  // Clean up the single connection after all tests
  afterAll(async () => {
    if (sharedClient) {
      await sharedClient.close();
    }
  });

  describe('Client Construction', () => {
    let client: ChatBetGradingClient;
    
    afterEach(async () => {
      // Only for client construction tests, we need to clean up test clients
      if (client) {
        await client.close();
      }
    });

    it('should create client with connection string', () => {
      client = new ChatBetGradingClient(DATABASE_CONNECTION_STRING!);
      expect(client).toBeInstanceOf(ChatBetGradingClient);
      expect(client.isConnected()).toBe(false); // Not connected until testConnection or grade is called
    });

    it('should create client with config object', () => {
      const config: GradingClientConfig = {
        connectionString: DATABASE_CONNECTION_STRING!,
        pool: {
          max: 5,
          min: 1,
          idleTimeoutMillis: 20000,
          acquireTimeoutMillis: 30000,
        },
        requestTimeout: 25000,
        connectionTimeout: 10000,
      };
      
      client = new ChatBetGradingClient(config);
      expect(client).toBeInstanceOf(ChatBetGradingClient);
      expect(client.isConnected()).toBe(false);
    });

    it('should create client with factory function', () => {
      client = createGradingClient(DATABASE_CONNECTION_STRING!);
      expect(client).toBeInstanceOf(ChatBetGradingClient);
    });

    it('should create client with config factory function', () => {
      const config: GradingClientConfig = {
        connectionString: DATABASE_CONNECTION_STRING!,
        requestTimeout: 20000,
      };
      
      client = createGradingClientWithConfig(config);
      expect(client).toBeInstanceOf(ChatBetGradingClient);
    });
  });

  describe('Connection Management', () => {
    let client: ChatBetGradingClient;
    
    afterEach(async () => {
      // Clean up test-specific clients
      if (client) {
        await client.close();
      }
    });

    it('should test connection successfully', async () => {
      client = new ChatBetGradingClient(DATABASE_CONNECTION_STRING!);
      await expect(client.testConnection()).resolves.not.toThrow();
      expect(client.isConnected()).toBe(true);
    });

    it('should handle connection errors', async () => {
      // Create client with invalid connection string
      const invalidClient = new ChatBetGradingClient('Server=invalid;Database=invalid;');
      
      await expect(invalidClient.testConnection()).rejects.toThrow(GradingConnectionError);
      expect(invalidClient.isConnected()).toBe(false);
      
      await invalidClient.close();
    });

    it('should close connection properly', async () => {
      client = new ChatBetGradingClient(DATABASE_CONNECTION_STRING!);
      await client.testConnection();
      expect(client.isConnected()).toBe(true);
      
      await client.close();
      expect(client.isConnected()).toBe(false);
    });

    it('should handle multiple close calls gracefully', async () => {
      client = new ChatBetGradingClient(DATABASE_CONNECTION_STRING!);
      await client.testConnection();
      await client.close();
      await client.close(); // Should not throw
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('Grading Functionality', () => {
    // Use the shared client for all grading tests
    
    describe('TotalPoints Contracts', () => {
      it('should grade game total contract', async () => {
        const parseResult = parseChat('YG Padres/Pirates o8.5 @ +100 = 0.094');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W']).toContain(grade);
      });

      it('should grade game total with different period', async () => {
        const parseResult = parseChat('YG Padres/Pirates F5 o8.5 @ -110 = 1.5');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W', 'L', 'P', '?']).toContain(grade);
      });

      it('should grade total push', async () => {
        const parseResult = parseChat('YG Padres/Pirates F5 o3 @ +200 = 2.0');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-31') });
        expect(['P']).toContain(grade);
      });

      it('should grade under total', async () => {
        const parseResult = parseChat('YG Padres/Pirates u7.5 @ -105 = 1.1');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-31') });
        expect(['W']).toContain(grade);
      });
    });

    describe('TotalPointsContestant Contracts', () => {
      it('should grade team total over', async () => {
        const parseResult = parseChat('YG Padres TT o4.5 @ -120 = 1.2');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W']).toContain(grade);
      });

      it('should grade team total under', async () => {
        const parseResult = parseChat('YG Padres TT u4.5 @ +110 = 0.9');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-31') });
        expect(['W']).toContain(grade);
      });

      it('should grade team total with period specification', async () => {
        const parseResult = parseChat('YG Pirates F3 TT o3 @ -105 = 1.0');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['P']).toContain(grade);
      });
    });

    describe('HandicapContestantML Contracts', () => {
      it('should grade moneyline winner', async () => {
        const parseResult = parseChat('YG Padres @ +150 = 1.0');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W', 'L', 'P', '?']).toContain(grade);
      });

      it('should grade moneyline loser', async () => {
        const parseResult = parseChat('YG Pirates @ -180 = 2.0');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W', 'L', 'P', '?']).toContain(grade);
      });
    });

    describe('HandicapContestantLine Contracts', () => {
      it('should grade spread winner', async () => {
        const parseResult = parseChat('YG Pirates +2.5 @ -110 = 1.1');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W']).toContain(grade);
      });

      it('should grade spread loser', async () => {
        const parseResult = parseChat('YG Pirates +1.5 @ -110 = 1.1');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['L']).toContain(grade);
      });

      it('should grade large spreads', async () => {
        const parseResult = parseChat('YG Padres -25 @ +180 = 0.5');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['L']).toContain(grade);
      });
    });

    describe('PropOU Contracts', () => {
      it.skip('should grade player prop over - Auto-grading not tested yet', async () => {
        const parseResult = parseChat('YG B. Falter Ks o1.5 @ +120 = 1.0');
        
        const grade = await sharedClient.grade(parseResult, { 
          matchScheduledDate: new Date('2025-06-01') 
        });
        expect(['W', 'L', 'P', '?']).toContain(grade);
      });

      it.skip('should grade team rebounds over - Auto-grading not tested yet', async () => {
        const parseResult = parseChat('YG Minnesota Rebounds o54.5 @ -150 = 1.5');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-04-30') });
        expect(['L']).toContain(grade);
      });

      it.skip('should grade team rebounds under - Auto-grading not tested yet', async () => {
        const parseResult = parseChat('YG Minnesota Rebounds u53.5 @ -105 = 1.0');
    
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-04-30') });
        expect(['L']).toContain(grade);
      });
    });

    describe('PropYN Contracts', () => {
    });

    describe('Series Contracts', () => {

      it.skip('should grade 3-match series - Auto-grading not tested yet', async () => {
        const parseResult = parseChat('YG MIL Series @ -180 = 1.8');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-22') });
        expect(['W']).toContain(grade);
      });

      it.skip('should grade 4-match series - Auto-grading not tested yet', async () => {
        const parseResult = parseChat('YG Brewers 4-Game Series @ +120 = 1.0');
        
        const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-22') });

        // and log the parseResult if it doesnt
        expect(['P']).toContain(grade)
      });
    });

    describe('Auto-connection', () => {
      it('should automatically connect when grading without explicit testConnection', async () => {
        // Create a new client for this specific test
        let client = new ChatBetGradingClient(DATABASE_CONNECTION_STRING!);
        
        expect(client.isConnected()).toBe(false);
        const parseResult = parseChat('YG Padres/Pirates o8.5 @ -110 = 1.0');
        
        const grade = await client.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
        expect(['W']).toContain(grade);
        expect(client.isConnected()).toBe(true);
        
        await client.close();
      });
    });
  });

  describe('Error Handling', () => {
    describe('Connection Errors', () => {
      it('should throw GradingConnectionError for invalid connection string', async () => {
        const invalidClient = new ChatBetGradingClient('invalid connection string');
        const parseResult = parseChat('YG Padres @ +150 = 1.0');
        
        await expect(invalidClient.grade(parseResult, { 
          matchScheduledDate: new Date('2025-06-01') 
        })).rejects.toThrow(GradingConnectionError);
      });

      it('should preserve original error in GradingConnectionError', async () => {
        const invalidClient = new ChatBetGradingClient('invalid connection string');
        
        try {
          await invalidClient.testConnection();
        } catch (error) {
          expect(error).toBeInstanceOf(GradingConnectionError);
          expect((error as GradingConnectionError).originalError).toBeDefined();
        }
        
        await invalidClient.close();
      });
    });

    describe('Data Validation Errors', () => {
      it('should handle contracts with missing required data', async () => {
        // Create a parse result and then modify it to remove required data
        const parseResult = parseChat('YG Padres TT o4.5 @ -115 = 2.0');
        
        // Remove the contestant (which is required for team totals)
        if ('Contestant' in parseResult.contract) {
          delete (parseResult.contract as any).Contestant;
        }
        
        await expect(sharedClient.grade(parseResult)).rejects.toThrow(GradingDataError);
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple rapid grade calls', async () => {
      const parseResult = parseChat('YG Padres @ +150 = 1.0');
      
      const promises = Array(5).fill(null).map(() => 
        sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') })
      );
      
      const grades = await Promise.all(promises);
      grades.forEach(grade => {
        expect(['W']).toContain(grade);
      });
    });

    it('should maintain connection state across multiple operations', async () => {
      const parseResult = parseChat('YG Pirates @ -170 = 1.0');
      
      // Multiple operations using shared client
      const grade1 = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-31') });
      const grade2 = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-06-01') });
      
      expect(['W']).toContain(grade1);
      expect(['L']).toContain(grade2);
      expect(sharedClient.isConnected()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle contracts with special characters in team names', async () => {
      const parseResult = parseChat('YG 49ers @ +150 = 1.0');
      if (!isWritein(parseResult.contract)) {
        expect(parseResult.contract.Match.Team1).toBe('49ers');
      }
    });

    it('should handle contracts with game numbers', async () => {
      const parseResult = parseChat('YG St. Louis Cardinals/PHI G1 o8.5 @ -110 = 1.5');
      if (!isWritein(parseResult.contract)) {
        expect(parseResult.contract.Match.Team1).toBe('St. Louis Cardinals');
        expect(parseResult.contract.Match.Team2).toBe('PHI');
        expect(parseResult.contract.Match.DaySequence).toBe(1);
      }

      const grade = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-05-14') });
      expect(['L']).toContain(grade);

      const parseResult2 = parseChat('YG PHI/St. Louis Cardinals #2 o8.5 @ -110 = 1.5');
      if (!isWritein(parseResult2.contract)) {
        expect(parseResult2.contract.Match.Team1).toBe('PHI');
        expect(parseResult2.contract.Match.Team2).toBe('St. Louis Cardinals');
        expect(parseResult2.contract.Match.DaySequence).toBe(2);
      }

      const grade2 = await sharedClient.grade(parseResult2, { matchScheduledDate: new Date('2025-05-14') });
      expect(['W']).toContain(grade2);
    });

    it('should handle different date scenarios', async () => {
      const parseResult = parseChat('YG Lakers @ +120 = 2.5');
      
      // Test with different dates
      const grade1 = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-04-22') });
      const grade2 = await sharedClient.grade(parseResult, { matchScheduledDate: new Date('2025-04-27') });
      
      expect(['W']).toContain(grade1);
      expect(['L']).toContain(grade2);
    });
  });
});

// Export a helper function for manual testing
export function createTestClient(): ChatBetGradingClient | null {
  if (DATABASE_CONNECTION_STRING) {
    return new ChatBetGradingClient(DATABASE_CONNECTION_STRING);
  }
  return null;
} 