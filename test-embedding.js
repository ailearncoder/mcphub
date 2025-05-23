// Simple test script for the OpenAI embeddings implementation
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testEmbedding() {
  if (!openai.apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable not set');
    console.log('Please create a .env file with your OpenAI API key:');
    console.log('OPENAI_API_KEY=your_api_key_here');
    process.exit(1);
  }

  const testText = "This is a test of the OpenAI embedding API";
  
  try {
    console.log(`Generating embedding for text: "${testText}"`);
    const start = Date.now();
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testText,
    });
    
    const duration = Date.now() - start;
    
    console.log(`✅ Successfully generated embedding!`);
    console.log(`Model: ${response.model}`);
    console.log(`Dimensions: ${response.data[0].embedding.length}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`First 5 values: [${response.data[0].embedding.slice(0, 5).join(', ')}]`);
  } catch (error) {
    console.error('❌ Error generating embedding:');
    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testEmbedding();
