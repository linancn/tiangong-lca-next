/**
 * LangGraph Client
 * Due to the CPU limitation of Supabase Edge Functions, we need to use the LangGraph SDK to call the LangGraph API.
 * LANGGRAPH_API_URL is updated every time the Langgraph service is deployed, so this variable needs to be updated after each deployment.
 */
import { Assistant, Client } from '@langchain/langgraph-sdk';

export const langgraphClient = new Client({
  apiUrl: Deno.env.get('LANGGRAPH_API_URL') ?? '',
  apiKey: Deno.env.get('LANGGRAPH_API_KEY') ?? '',
});

export async function listAssistants(): Promise<Assistant[]> {
  const assistants = (await langgraphClient.assistants.search()) as Assistant[];
  return assistants;
}
