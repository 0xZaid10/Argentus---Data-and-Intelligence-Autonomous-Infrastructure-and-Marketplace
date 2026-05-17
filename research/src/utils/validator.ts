import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  anthropicApiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  llmModel: z.string().default('anthropic/claude-opus-4.7'),
  llmBaseUrl: z.string().default('https://api.tokenrouter.com/v1'),
  etherscanApiKey: z.string().default(''),
  searchApiKey: z.string().default(''),
  port: z.coerce.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.string().default('info'),
  sqlitePath: z.string().default('./.agentmesh/research.db'),
});

export type ResearchConfig = z.infer<typeof configSchema>;

export function loadConfig(): ResearchConfig {
  const result = configSchema.safeParse({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    llmModel: process.env.LLM_MODEL,
    llmBaseUrl: process.env.ANTHROPIC_BASE_URL,
    etherscanApiKey: process.env.ETHERSCAN_API_KEY,
    searchApiKey: process.env.SEARCH_API_KEY,
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    sqlitePath: process.env.SQLITE_PATH,
  });

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Config validation failed:\n${errors}`);
  }

  return result.data;
}
