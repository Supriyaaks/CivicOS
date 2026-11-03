import dotenv from 'dotenv';
import { aiService } from './ai.service';

dotenv.config();

async function runTest() {
  console.log('--- AI Infrastructure Test ---');
  
  try {
    console.log('Checking Ollama availability...');
    const status = await aiService.checkAIAvailability();
    console.log(`Status: ${status.available ? '✅ Available' : '❌ Unavailable'}`);
    console.log(`Model: ${status.model}`);
    console.log(`Message: ${status.message}`);

    if (!status.available) {
      console.error('AI service is not available. Please ensure Ollama is running locally.');
      process.exit(1);
    }

    console.log('\nSending test prompt to Llama 3.2...');
    const response = await aiService.generateResponse({
      prompt: 'Hello! You are the CivicOS AI assistant. Please give me a one-sentence greeting to a city official.',
      systemPrompt: 'You are a professional, helpful municipal AI assistant.'
    });

    console.log('\n--- AI Response ---');
    console.log(response.content);
    console.log('------------------');
    console.log(`Model: ${response.model}`);
    console.log(`Timestamp: ${response.timestamp}`);

  } catch (error: any) {
    console.error('Test failed with error:', error.message);
    process.exit(1);
  }
}

runTest();
