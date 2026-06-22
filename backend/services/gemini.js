import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Check if we have at least one AI API key configured
const API_KEY = OPENROUTER_API_KEY || GEMINI_API_KEY || OPENAI_API_KEY;
const HAS_AI_KEY = !!API_KEY;

const MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';
const EMBEDDING_MODEL = process.env.OPENROUTER_EMBEDDING_MODEL || 'openai/text-embedding-3-small';

if (GEMINI_API_KEY) {
  console.log(`✅ Native Gemini API Key configured.`);
}
if (OPENROUTER_API_KEY) {
  console.log(`✅ OpenRouter API configured (Model: ${MODEL}, Embeddings: ${EMBEDDING_MODEL}).`);
}
if (OPENAI_API_KEY) {
  console.log(`✅ OpenAI Fallback API Key configured.`);
}
if (!HAS_AI_KEY) {
  console.warn('⚠️ No AI API Keys are configured. The app will run in MOCK mode.');
}

const safeJsonParse = (text) => {
  try {
    let cleanText = text.trim();

    // Strip DeepSeek R1 / reasoning model <think>...</think> blocks
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // Try direct parse first
    try {
      return JSON.parse(cleanText);
    } catch (_) {
      // Fallback: extract first JSON object or array from the text
      const jsonMatch = cleanText.match(/({[\s\S]*}|\[[\s\S]*\])/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    }
  } catch (err) {
    console.error('Failed to parse JSON response:', text?.substring(0, 300), err);
    throw err;
  }
};


/**
 * Generates an embedding vector (1536 dimensions for text-embedding-3-small, 768 for others) for a given text.
 */
export const generateEmbedding = async (text) => {
  if (!HAS_AI_KEY) {
    // Return a random 1536-dim vector for mock testing
    return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  }

  // 1. Try OpenRouter embeddings first if configured
  if (OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          return result.data[0].embedding;
        }
      }
    } catch (err) {
      console.warn('⚠️ OpenRouter embedding failed, trying fallback...', err.message);
    }
  }

  // 2. Try OpenAI embeddings next if configured
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          return result.data[0].embedding;
        }
      }
    } catch (err) {
      console.warn('⚠️ OpenAI embedding failed, trying fallback...', err.message);
    }
  }

  // 3. Try Native Gemini embeddings as last resort
  if (GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const result = await model.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 1536
      });
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
    } catch (err) {
      console.warn('⚠️ Native Gemini embedding failed:', err.message);
    }
  }

  return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
};

/**
 * Generates embeddings for an array of texts in batches to prevent network flooding and rate limits.
 */
export const generateEmbeddingsBatch = async (texts) => {
  if (!HAS_AI_KEY) {
    return texts.map(() => Array.from({ length: 1536 }, () => Math.random() * 2 - 1));
  }

  // 1. Try OpenRouter embeddings batch
  if (OPENROUTER_API_KEY) {
    try {
      const batchSize = 32;
      const batches = [];
      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }
      
      const batchPromises = batches.map(async (batch) => {
        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: batch
          })
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const result = await response.json();
        const sortedData = result.data.sort((a, b) => a.index - b.index);
        return sortedData.map(item => item.embedding);
      });
      
      const resolved = await Promise.all(batchPromises);
      return resolved.flat();
    } catch (err) {
      console.warn('⚠️ OpenRouter batch embedding failed, trying fallback...', err.message);
    }
  }

  // 2. Try OpenAI embeddings batch
  if (OPENAI_API_KEY) {
    try {
      const batchSize = 32;
      const batches = [];
      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }

      const batchPromises = batches.map(async (batch) => {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: batch
          })
        });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const result = await response.json();
        const sortedData = result.data.sort((a, b) => a.index - b.index);
        return sortedData.map(item => item.embedding);
      });

      const resolved = await Promise.all(batchPromises);
      return resolved.flat();
    } catch (err) {
      console.warn('⚠️ OpenAI batch embedding failed, trying fallback...', err.message);
    }
  }

  // 3. Try Native Gemini embeddings batch
  if (GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const batchPromises = texts.map(async (text) => {
        const result = await model.embedContent({
          content: { parts: [{ text }] },
          outputDimensionality: 1536
        });
        return result.embedding.values;
      });
      return await Promise.all(batchPromises);
    } catch (err) {
      console.warn('⚠️ Native Gemini batch embedding failed:', err.message);
    }
  }

  return texts.map(() => Array.from({ length: 1536 }, () => Math.random() * 2 - 1));
};

/**
 * Unified completions function with fallback flow.
 */
const callOpenRouterChat = async (prompt, systemInstruction = '', jsonMode = false, maxTokens = 1500) => {
  const errors = [];

  // 1. Try Native Gemini API first if GEMINI_API_KEY is configured
  if (GEMINI_API_KEY) {
    try {
      console.log('🤖 Attempting chat completion via Native Gemini API...');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const modelName = 'gemini-2.5-flash'; 
      const model = genAI.getGenerativeModel({ 
        model: modelName,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      });

      const contents = [];
      if (systemInstruction) {
        contents.push({ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] });
      }
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await model.generateContent({ contents });
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        console.log('   ✅ Native Gemini API call succeeded.');
        return text;
      }
      throw new Error('Empty response from Native Gemini API');
    } catch (error) {
      console.warn('⚠️ Native Gemini API call failed:', error.message);
      errors.push(`Gemini API: ${error.message}`);
    }
  }

  // 2. Try OpenRouter API next if OPENROUTER_API_KEY is configured
  if (OPENROUTER_API_KEY) {
    try {
      console.log('🤖 Attempting chat completion via OpenRouter API...');
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        console.log('   ✅ OpenRouter API call succeeded.');
        return data.choices[0].message.content;
      }
      throw new Error('Unexpected OpenRouter response structure');
    } catch (error) {
      console.warn('⚠️ OpenRouter API call failed:', error.message);
      errors.push(`OpenRouter API: ${error.message}`);
    }
  }

  // 3. Try OpenAI API as fallback if OPENAI_API_KEY is configured
  if (OPENAI_API_KEY) {
    try {
      console.log('🤖 Attempting chat completion via OpenAI Fallback API...');
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: "json_object" } : undefined
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        console.log('   ✅ OpenAI API call succeeded.');
        return data.choices[0].message.content;
      }
      throw new Error('Unexpected OpenAI response structure');
    } catch (error) {
      console.warn('⚠️ OpenAI API call failed:', error.message);
      errors.push(`OpenAI API: ${error.message}`);
    }
  }

  throw new Error(`All configured AI providers failed. Errors: ${errors.join(' | ')}`);
};

/**
 * Extracts a mind map structure (nodes & edges) from a text.
 * NOTE: Does NOT fall back to mock data on failure — throws so callers
 * can mark the document as failed rather than saving garbage nodes.
 */
export const extractConceptGraph = async (text) => {
  if (!API_KEY) {
    return {
      nodes: [
        { id: "mock-segment-node-" + Math.floor(Math.random() * 1000), label: "Segment Concept Fallback", description: "A mock concept extracted from a document segment when running in fallback/mock mode.", group: "related" }
      ],
      edges: []
    };
  }

  const prompt = `
    You are an educational AI. Analyze the following text and extract ONLY the key concepts actually present in this text.
    DO NOT invent or add topics that are not explicitly mentioned in the text.
    
    Respond with ONLY a valid JSON object — no explanation, no preamble, no markdown, no <think> tags.
    Use this exact schema:
    {
      "nodes": [
        { "id": "unique-slug-id", "label": "Short Topic Title", "description": "One sentence description from the text", "group": "core" }
      ],
      "edges": [
        { "id": "edge-1", "source": "source-node-id", "target": "target-node-id", "label": "relationship" }
      ]
    }

    Rules:
    - Extract 5 to 12 nodes based ONLY on topics found in the text below
    - Node labels must be real topics from the text, not generic titles
    - group must be one of: "core", "advanced", "related"
    - id must be a short lowercase slug (e.g. "matrix-multiplication")
    - Output ONLY the JSON object, nothing else

    Text to analyze:
    ---
    ${text.substring(0, 30000)}
  `;

  // Let errors propagate — caller must handle and mark document as failed
  const responseText = await callOpenRouterChat(prompt, 'You are an educational AI. Output ONLY valid JSON, no explanation, no markdown.', true, 2500);
  return safeJsonParse(responseText);
};


/**
 * Consolidated API call to extract the Concept Graph, Flashcards, and Quiz in a single OpenRouter request.
 * This completely avoids concurrent rate limit hits on the free model.
 */
export const generateAllStudyMaterialsAI = async (text, documentName) => {
  if (!API_KEY) {
    console.warn('⚠️ No OPENROUTER_API_KEY configured. Using mock fallback study materials.');
    const subject = documentName.replace(/\.[^/.]+$/, '');
    return {
      graph: getMockSubjectGraph(subject),
      flashcards: generateMockFlashcards(),
      quiz: generateMockQuiz(documentName)
    };
  }

  // Send as much text as possible to the AI for accurate extraction
  const maxChars = 30000;
  const textToSend = text.substring(0, maxChars);
  console.log(`📄 Sending ${textToSend.length} chars (${Math.round(textToSend.length / text.length * 100)}% of document) to AI for extraction.`);

  const prompt = `
    You are an expert educational AI. Your task is to analyze the EXACT study text below from the document "${documentName}" and extract study materials based ONLY on what is written in the text.

    CRITICAL RULES:
    - Extract concepts, definitions, topics, and relationships that ARE PRESENT in the text below.
    - DO NOT invent, assume, or add any concept that is not explicitly mentioned in the text.
    - Node labels must be real topic names from the document (e.g. if the text discusses "Page Replacement Algorithms", use that exact topic).
    - Edge labels must describe actual relationships between concepts as described in the text.
    - If the text discusses specific algorithms, formulas, architectures, or processes, use those specific names as nodes.
    - Every node MUST have a description that comes directly from the text content.

    Extract:
    1. A concept mind-map with 8-15 nodes (key concepts from the text) and their relationships as edges.
    2. A set of 5-8 high-quality study flashcards based on the actual content.
    3. A 5-question multiple-choice quiz based on the actual content.

    Respond with ONLY a valid JSON object matching this exact schema. No explanations, no preamble, no markdown, no <think> tags:
    {
      "graph": {
        "nodes": [
          { "id": "unique-slug-id", "label": "Exact Topic Name From Text", "description": "Description directly from the text content", "group": "core" | "advanced" | "related" }
        ],
        "edges": [
          { "id": "edge-id", "source": "source-node-slug", "target": "target-node-slug", "label": "relationship as described in text" }
        ]
      },
      "flashcards": [
        { "front": "Question or term from the text", "back": "Answer or definition from the text" }
      ],
      "quiz": {
        "title": "Quiz Title Based on Document Content",
        "questions": [
          {
            "question": "Question about content in the text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswerIndex": 0,
            "explanation": "Explanation based on the text."
          }
        ]
      }
    }

    Text to analyze (from the actual document):
    ---
    ${textToSend}
    ---
  `;

  try {
    console.log(`🤖 Consolidated Study Materials Request to OpenRouter for document "${documentName}"...`);
    const responseText = await callOpenRouterChat(
      prompt, 
      'You are an educational AI designed to construct study materials from provided text. Return ONLY a valid JSON object matching the requested schema. Extract concepts that actually exist in the provided text.', 
      true, 
      4000 // larger output token space for detailed extraction
    );
    const parsed = safeJsonParse(responseText);
    
    const nodes = parsed.graph?.nodes || parsed.nodes || [];
    const edges = parsed.graph?.edges || parsed.edges || [];

    // Validate that we got meaningful content
    if (nodes.length === 0) {
      throw new Error('AI returned empty node list. The text may not contain extractable concepts.');
    }

    // Parse flashcards flexibly - handle various AI response formats
    let flashcards = parsed.flashcards || [];
    if (flashcards.length === 0 && Array.isArray(parsed)) {
      // Some models return the whole thing as an array
      flashcards = [];
    }

    // Parse quiz flexibly
    let quiz = parsed.quiz || null;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      // Try alternate structures
      if (parsed.questions && Array.isArray(parsed.questions)) {
        quiz = { title: `Concept Quiz: ${documentName}`, questions: parsed.questions };
      } else {
        quiz = { title: `Concept Quiz: ${documentName}`, questions: [] };
      }
    }

    console.log(`✅ AI extracted ${nodes.length} nodes, ${edges.length} edges, ${flashcards.length} flashcards, ${quiz.questions.length} quiz questions.`);
    
    return {
      graph: { nodes, edges },
      flashcards,
      quiz
    };
  } catch (error) {
    console.error('❌ Error generating consolidated study materials via OpenRouter:', error.message);
    throw new Error(`AI study material generation failed: ${error.message}. Ensure OPENROUTER_API_KEY is valid and the document contains readable text.`);
  }
};



/**
 * Generates a set of spaced-repetition ready flashcards.
 */
export const generateFlashcards = async (text) => {
  if (!API_KEY) {
    return generateMockFlashcards();
  }

  try {
    const prompt = `
      Create 5 to 8 high-quality study flashcards based on the text below.
      Format the output as a JSON object matching this schema:
      {
        "flashcards": [
          { "front": "A clear, concise question or term", "back": "A concise answer or definition" }
        ]
      }

      Text:
      ---
      ${text.substring(0, 8000)}
    `;

    const responseText = await callOpenRouterChat(prompt, 'You are an AI learning assistant that outputs structured flashcard decks in JSON.', true);
    const parsed = safeJsonParse(responseText);
    return parsed.flashcards || parsed;
  } catch (error) {
    console.error('Error generating flashcards via OpenRouter, returning mock:', error);
    return generateMockFlashcards();
  }
};

/**
 * Generates a multiple-choice quiz.
 */
export const generateQuiz = async (text, docTitle = 'Concept Quiz') => {
  if (!API_KEY) {
    return generateMockQuiz(docTitle);
  }

  try {
    const prompt = `
      Create a 5-question multiple-choice quiz based on the text below.
      Format the output as a JSON object matching this schema:
      {
        "title": "A descriptive title for this quiz",
        "questions": [
          {
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswerIndex": 0,
            "explanation": "Brief explanation of why the correct answer is right and others are wrong."
          }
        ]
      }

      Text:
      ---
      ${text.substring(0, 8000)}
    `;

    const responseText = await callOpenRouterChat(prompt, 'You are an academic testing AI that generates multiple choice quizzes formatted in JSON.', true);
    return safeJsonParse(responseText);
  } catch (error) {
    console.error('Error generating quiz via OpenRouter, returning mock:', error);
    return generateMockQuiz(docTitle);
  }
};

/**
 * Gets a model to answer chat questions with RAG context streaming.
 * Yields text strings chunk-by-chunk.
 */
export async function* getGeminiChatStream(chatHistory, contextText, systemPromptOverride) {
  if (!HAS_AI_KEY) {
    return null;
  }

  const systemInstruction = systemPromptOverride || `You are an advanced, empathetic AI Study Companion.
Your goal is to help students learn effectively.
Use the following context parsed from the student's study material to ground your answers:
===
${contextText}
===
Always maintain educational accuracy, break down complex topics, and cite specific terms from the context.
If the context doesn't contain the answer, you can use your general knowledge, but clearly state you are doing so.
Keep answers concise, formatted nicely in Markdown, and use bullet points where helpful.`;

  const messages = [
    { role: 'system', content: systemInstruction }
  ];

  chatHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    });
  });

  // 1. Try Native Gemini Stream first if configured
  if (GEMINI_API_KEY) {
    try {
      console.log('🤖 Starting streaming session via Native Gemini API...');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const contents = [];
      contents.push({ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}` }] });
      chatHistory.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });

      const resultStream = await model.generateContentStream({ contents });
      for await (const chunk of resultStream.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      return; // Succeeded
    } catch (err) {
      console.warn('⚠️ Native Gemini Stream failed, attempting fallback...', err.message);
    }
  }

  // 2. Try OpenRouter Stream next if configured
  if (OPENROUTER_API_KEY) {
    try {
      console.log('🤖 Starting streaming session via OpenRouter API...');
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          stream: true,
          max_tokens: 800
        })
      });

      if (response.ok) {
        const reader = response.body;
        const decoder = new TextDecoder();
        for await (const chunk of reader) {
          const chunkStr = decoder.decode(chunk, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) yield text;
              } catch (_) {}
            }
          }
        }
        return; // Succeeded
      } else {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('⚠️ OpenRouter Stream failed, trying next fallback...', err.message);
    }
  }

  // 3. Try OpenAI Stream as fallback if configured
  if (OPENAI_API_KEY) {
    try {
      console.log('🤖 Starting streaming session via OpenAI API...');
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          stream: true,
          max_tokens: 800
        })
      });

      if (response.ok) {
        const reader = response.body;
        const decoder = new TextDecoder();
        for await (const chunk of reader) {
          const chunkStr = decoder.decode(chunk, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || cleanLine === 'data: [DONE]') continue;
            if (cleanLine.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(cleanLine.substring(6));
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) yield text;
              } catch (_) {}
            }
          }
        }
        return; // Succeeded
      } else {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('⚠️ OpenAI Stream failed:', err.message);
    }
  }

  throw new Error('All configured AI streaming providers failed.');
}

/**
 * Extracts a mind-map of concepts for a given subject.
 */
export const generateSubjectGraphAI = async (subject, text) => {
  if (!API_KEY) {
    throw new Error('No OpenRouter API key configured. Cannot generate subject graph.');
  }

  const maxChars = 20000;
  const textToSend = text.substring(0, maxChars);
  console.log(`📄 Subject graph: sending ${textToSend.length} chars for "${subject}".`);

  try {
    const prompt = `
      You are an expert educational AI. Analyze the EXACT text below under the subject "${subject}" and extract a concept learning mind-map.

      CRITICAL RULES:
      - Extract concepts that ARE PRESENT in the text below. Do NOT invent topics.
      - Node labels must be real topic names from the document.
      - Every node must have a description from the text.
      - Edge labels must describe actual relationships as described in the text.

      Extract 8-15 crucial concept nodes and their prerequisite/dependency relationships.

      Format as JSON only:
      {
        "nodes": [
          { "id": "camelCaseId", "label": "Exact Topic Name From Text", "description": "Description from the text content", "group": "core" | "advanced" | "subtopic" }
        ],
        "edges": [
          { "id": "e-source-target", "source": "sourceId", "target": "targetId", "label": "relationship as described in text" }
        ]
      }
      
      Text to analyze:
      ---
      ${textToSend}
      ---
    `;

    const responseText = await callOpenRouterChat(prompt, 'You are an educational AI. Extract concepts from the provided text and return ONLY valid JSON. Do not invent topics not in the text.', true, 3000);
    const parsed = safeJsonParse(responseText);
    
    const nodes = parsed.nodes || [];
    if (nodes.length === 0) {
      throw new Error('AI returned empty node list for subject graph.');
    }
    console.log(`✅ Subject graph extracted ${nodes.length} nodes for "${subject}".`);
    return parsed;
  } catch (error) {
    console.error(`❌ OpenRouter subject graph generation failed for "${subject}":`, error.message);
    throw new Error(`Subject graph generation failed: ${error.message}`);
  }
};

/**
 * Generate detailed review profile for a node on demand.
 */
export const generateNodeDetailsAI = async (subject, label) => {
  if (!API_KEY) {
    return getMockNodeDetails(label);
  }

  try {
    const prompt = `
      Create a detailed educational review profile for the concept "${label}" within the subject "${subject}".
      Format the output as a JSON object matching this schema:
      {
        "definition": "A precise, one-sentence academic definition.",
        "explanation": "A comprehensive, multi-paragraph educational explanation covering key sub-concepts and mechanisms.",
        "example": "A real-world practical example showing the concept in action.",
        "formulas": "Relevant math equations, pseudocode, code syntax, or standard formats. If none apply, write 'N/A'.",
        "diagram": "A valid, clean Mermaid.js flowchart or graph syntax representing the concept's structure or workflow (e.g. 'graph TD\\n  A[Start] --> B[Process]'). Output only the raw Mermaid code string without markdown block fences.",
        "relatedTopics": ["Related Concept A", "Related Concept B"],
        "interviewQuestions": [
          { "question": "Common exam/interview question?", "answer": "Concise structured answer." },
          { "question": "Another sample question?", "answer": "Concise structured answer." }
        ],
        "quizQuestions": [
          {
            "question": "A multiple-choice quiz question testing comprehension?",
            "options": ["Distractor A", "Correct Answer", "Distractor B", "Distractor C"],
            "correctAnswerIndex": 1,
            "explanation": "Explanation of why the correct option is right."
          }
        ]
      }
    `;

    const responseText = await callOpenRouterChat(prompt, 'You are an educational AI designed to construct node detailed profiles formatted in JSON.', true);
    return safeJsonParse(responseText);
  } catch (error) {
    console.error(`OpenRouter node expansion failed for ${label}:`, error);
    return getMockNodeDetails(label);
  }
};

/**
 * Generate detailed review profiles for multiple nodes in a single API call to conserve rate limits.
 */
export const generateAllNodeDetailsAI = async (subject, nodes, text) => {
  if (!API_KEY) {
    return { details: {} };
  }

  try {
    const conceptsList = nodes.map(n => ({ id: n.nodeId, label: n.label }));
    const prompt = `
      You are an educational AI. Below is a list of concepts extracted from a study document under the subject "${subject}":
      ${JSON.stringify(conceptsList)}

      For each concept in the list, generate:
      1. A detailed educational explanation (2-3 sentences).
      2. A real-world practical example (1-2 sentences).
      3. Relevant math equations, pseudocode, code syntax, or 'N/A' for formulas.
      4. A valid, clean Mermaid.js flowchart or graph syntax visualizing the concept (e.g. 'graph TD\n  A[Start] --> B[Process]').
      5. A list of 1-2 key related topics from the list.
      6. 1-2 sample exam/interview questions with structured concise answers.

      Base your explanations strictly on the text below:
      ---
      ${text.substring(0, 60000)}
      ---

      Format the output as a single JSON object matching this schema:
      {
        "details": {
          "conceptId": {
            "explanation": "Explanation here",
            "example": "Example here",
            "formulas": "Formulas or 'N/A'",
            "diagram": "Mermaid diagram code here",
            "relatedTopics": ["Topic A", "Topic B"],
            "interviewQuestions": [
              { "question": "Question?", "answer": "Answer" }
            ]
          }
        }
      }

      Respond with ONLY the valid JSON object. Do not include markdown code fences, comments, or any extra text.
    `;

    console.log(`🤖 Requesting combined node details from OpenRouter for ${nodes.length} concepts...`);
    const responseText = await callOpenRouterChat(
      prompt,
      'You are an educational AI designed to construct node detailed profiles formatted in JSON. Return ONLY JSON.',
      true,
      3000 // request larger output token space to accommodate multiple descriptions
    );
    return safeJsonParse(responseText);
  } catch (error) {
    console.error(`OpenRouter batch node expansion failed:`, error);
    return { details: {} };
  }
};


/**
 * Generate advisory chat for a subject graph.
 */
export const generateGraphChatAI = async (subject, graphContext, chatSession, message) => {
  if (!API_KEY) {
    return `Based on the Knowledge Graph for **${subject}**, here are some insights:
- Direct connections represent prerequisites. For example, you should finish core foundation topics before jumping into advanced leaves.
- You have some topics flagged as weak. Focus on reviewing those nodes (marked with a 🔥 indicator) and take the node-specific quiz.
- To use live AI reasoning, please supply an OpenRouter API Key.`;
  }

  try {
    const systemInstruction = `You are a learning advisor guiding a student through their study path for "${subject}".
Below is the concept graph representing this subject:
===
Nodes: ${JSON.stringify(graphContext.nodes)}
Edges/Dependencies: ${JSON.stringify(graphContext.edges)}
===
Answer questions regarding what to study next, what concepts are related, descriptions of specific topics, and revision strategies based on the graph structure.
Refer to specific node labels and edge dependencies. Format answers cleanly in markdown.`;

    const responseText = await callOpenRouterChat(message, systemInstruction, false);
    return responseText;
  } catch (error) {
    console.error('OpenRouter graph chat failed:', error);
    return `Error querying advisor: ${error.message}`;
  }
};

// ==========================================
// MOCK FALLBACK DATA GENERATORS
// ==========================================

function generateMockGraph() {
  return {
    nodes: [
      { id: '1', label: 'Study Companion', description: 'Core learning hub of the application', group: 'core' },
      { id: '2', label: 'Spaced Repetition', description: 'Technique where card reviews are spaced dynamically', group: 'core' },
      { id: '3', label: 'RAG Retrieval', description: 'Augmenting model requests with document database embeddings', group: 'advanced' },
      { id: '4', label: 'Knowledge Graph', description: 'Interactive visual mind map of custom concepts', group: 'related' }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'implements' },
      { id: 'e1-3', source: '1', target: '3', label: 'integrates' },
      { id: 'e1-4', source: '1', target: '4', label: 'visualizes' },
      { id: 'e2-4', source: '2', target: '4', label: 'maps concepts' }
    ]
  };
}

export function generateMockFlashcards() {
  return [
    { front: 'What is RAG in AI?', back: 'Retrieval-Augmented Generation. It queries external documents to supply models with accurate, up-to-date facts.' },
    { front: 'How does Spaced Repetition work?', back: 'It prompts users to review cards at expanding intervals (1 day, 3 days, 7 days) to reinforce memory retention.' },
    { front: 'What is the role of Vector Embeddings?', back: 'Vectors represent semantic meaning of words/phrases as float values, enabling distance-based matching.' }
  ];
}

export function generateMockQuiz(title) {
  return {
    title: `Mock Quiz: ${title}`,
    questions: [
      {
        question: 'Which component is used to map concepts visually in the companion frontend?',
        options: ['Recharts', 'React Flow', 'Framer Motion', 'Zustand'],
        correctAnswerIndex: 1,
        explanation: 'React Flow is the node-based graph engine selected for plotting interactive concept mappings.'
      },
      {
        question: 'What does the spacing interval represent in an SRS flashcard system?',
        options: ['Time between cards during review', 'Days before a card is shown to the user again', 'Total count of cards in a deck', 'Number of answers a user got wrong'],
        correctAnswerIndex: 1,
        explanation: 'The spacing interval determines the next time a flashcard needs to be reviewed to optimize memory retention.'
      }
    ]
  };
}

export function getMockSubjectGraph(subject) {
  const subUpper = subject.toUpperCase();
  if (subUpper.includes('DBMS') || subUpper.includes('DATABASE')) {
    return {
      nodes: [
        { id: 'dbms', label: 'DBMS Architecture', description: 'Core structural model of a database management system.', group: 'core' },
        { id: 'erModel', label: 'Entity-Relationship Model', description: 'Conceptual data model used to design database systems.', group: 'core' },
        { id: 'sql', label: 'SQL (Structured Query Language)', description: 'Standard declarative programming language for relational databases.', group: 'core' },
        { id: 'normalization', label: 'Normalization (1NF, 2NF, 3NF, BCNF)', description: 'Process of structuring fields to reduce dependency redundancy.', group: 'advanced' },
        { id: 'transactions', label: 'ACID Transactions', description: 'Core properties ensuring data integrity and safety.', group: 'advanced' },
        { id: 'indexing', label: 'B-Trees & Indexing', description: 'Physical tuning to optimize query speed.', group: 'subtopic' }
      ],
      edges: [
        { id: 'e-dbms-er', source: 'dbms', target: 'erModel', label: 'models structure' },
        { id: 'e-er-sql', source: 'erModel', target: 'sql', label: 'translates to schemas' },
        { id: 'e-sql-norm', source: 'sql', target: 'normalization', label: 'requires logic' },
        { id: 'e-dbms-trans', source: 'dbms', target: 'transactions', label: 'guarantees ACID' },
        { id: 'e-dbms-idx', source: 'dbms', target: 'indexing', label: 'structures files' }
      ]
    };
  }

  if (subUpper.includes('MICROPROCESSOR') || subUpper.includes('8086') || subUpper.includes('ARCHITECTURE') || subUpper.includes('CPU') || subUpper.includes('ASSEMBLY')) {
    return {
      nodes: [
        { id: 'cpu_arch', label: '8086 CPU Architecture', description: 'Internal structure and block diagram of the 8086 microprocessor.', group: 'core' },
        { id: 'registers', label: 'Registers & Addressing', description: 'General-purpose, index, pointer, and segment registers.', group: 'core' },
        { id: 'memory_seg', label: 'Memory Segmentation', description: 'Division of memory into segments (CS, DS, SS, ES) for logical addressing.', group: 'core' },
        { id: 'biu_eu', label: 'BIU & EU Execution', description: 'Bus Interface Unit and Execution Unit pipeline mechanism.', group: 'advanced' },
        { id: 'inst_set', label: 'Instruction Set & Assembly', description: 'Assembly language instructions and programming paradigms.', group: 'advanced' },
        { id: 'interrupts', label: 'Interrupt Handling', description: 'Hardware and software interrupts processing in 8086.', group: 'subtopic' }
      ],
      edges: [
        { id: 'e-arch-reg', source: 'cpu_arch', target: 'registers', label: 'contains' },
        { id: 'e-arch-mem', source: 'cpu_arch', target: 'memory_seg', label: 'addresses' },
        { id: 'e-arch-biu', source: 'cpu_arch', target: 'biu_eu', label: 'implements pipeline' },
        { id: 'e-reg-inst', source: 'registers', target: 'inst_set', label: 'manipulated by' },
        { id: 'e-inst-int', source: 'inst_set', target: 'interrupts', label: 'triggers' }
      ]
    };
  }

  if (subUpper.includes('ALGEBRA') || subUpper.includes('LINEAR') || subUpper.includes('MATRIX') || subUpper.includes('VECTOR')) {
    return {
      nodes: [
        { id: 'linear_algebra', label: 'Linear Algebra', description: 'Study of vectors, vector spaces, and linear equations.', group: 'core' },
        { id: 'matrices', label: 'Matrices & Systems', description: 'Rectangular arrays of numbers representing linear transformations.', group: 'core' },
        { id: 'vectors', label: 'Vectors & Spaces', description: 'Elements of vector spaces with magnitude and direction.', group: 'core' },
        { id: 'linear_trans', label: 'Linear Transformations', description: 'Mappings between vector spaces preserving addition and multiplication.', group: 'advanced' },
        { id: 'eigenvalues', label: 'Eigenvalues & Eigenvectors', description: 'Scalars and vectors representing scaling transformations.', group: 'advanced' }
      ],
      edges: [
        { id: 'e-la-mat', source: 'linear_algebra', target: 'matrices', label: 'uses' },
        { id: 'e-la-vec', source: 'linear_algebra', target: 'vectors', label: 'defines' },
        { id: 'e-mat-trans', source: 'matrices', target: 'linear_trans', label: 'represents' },
        { id: 'e-vec-trans', source: 'vectors', target: 'linear_trans', label: 'transformed by' },
        { id: 'e-trans-eigen', source: 'linear_trans', target: 'eigenvalues', label: 'characterizes' }
      ]
    };
  }

  return {
    nodes: [
      { id: 'programming', label: 'Variables & Scope', description: 'Basic storage units in memory.', group: 'core' },
      { id: 'functions', label: 'Functions & Recursion', description: 'Reusable code blocks calling themselves.', group: 'core' },
      { id: 'dataStructures', label: 'Arrays & Lists', description: 'Linear sequential structures.', group: 'core' },
      { id: 'trees', label: 'Binary Search Trees', description: 'Hierarchical node-based networks.', group: 'advanced' },
      { id: 'sorting', label: 'Algorithms (Sorting & Searching)', description: 'Step-by-step resolution logic.', group: 'advanced' }
    ],
    edges: [
      { id: 'e-prog-func', source: 'programming', target: 'functions', label: 'implements' },
      { id: 'e-func-ds', source: 'functions', target: 'dataStructures', label: 'manipulates' },
      { id: 'e-ds-trees', source: 'dataStructures', target: 'trees', label: 'transforms into' },
      { id: 'e-ds-sort', source: 'dataStructures', target: 'sorting', label: 'utilizes' }
    ]
  };
}

export function getMockNodeDetails(label) {
  const normLabel = label.trim().toLowerCase();
  
  const library = {
    // --- DBMS ---
    'dbms architecture': {
      definition: "DBMS Architecture represents the structural design of a Database Management System, defining how data is stored, processed, and accessed by users.",
      explanation: "DBMS Architecture is typically structured as 1-tier, 2-tier, or 3-tier. The 3-tier architecture is the standard for modern web applications. It consists of the Presentation Layer (UI), the Application/Logic Layer (Application Server), and the Database Layer (Database Engine). This separation ensures security, scalability, and independent management of each tier.",
      example: "In a modern e-commerce application, the web frontend represents the Presentation Tier, the backend Node.js server represents the Application Tier, and MongoDB/PostgreSQL represents the Database Tier.",
      formulas: "Tiers: Presentation (HTML/JS) -> Application (Express/Python) -> Database (Mongoose/SQL).",
      diagram: "graph TD\n  Client[Presentation Tier: Web Browser] --> Server[Application Tier: Node.js / Express]\n  Server --> Database[Database Tier: PostgreSQL Engine]",
      relatedTopics: ['Entity-Relationship Model', 'SQL (Structured Query Language)'],
    },
    'entity-relationship model': {
      definition: "An Entity-Relationship (ER) Model is a high-level conceptual data model used to design database schemas by defining entities, attributes, and relationships.",
      explanation: "ER Modeling represents real-world objects as entities (e.g., Customer, Product) with attributes (e.g., Name, Price). Relationships connect these entities with cardinality constraints, such as one-to-one (1:1), one-to-many (1:N), or many-to-many (M:N). ER diagrams are translated into tables in relational databases.",
      example: "A relational database schema for a university where a 'Student' entity has a one-to-many relationship with 'Course Enrollment'.",
      formulas: "ER Components: Rectangles (Entities), Ovals (Attributes), Diamonds (Relationships).",
      diagram: "graph LR\n  Customer[Customer Entity] ===|Places| Order{Order Relationship}\n  Order ===|Contains| Product[Product Entity]",
      relatedTopics: ['DBMS Architecture', 'SQL (Structured Query Language)'],
    },
    'sql (structured query language)': {
      definition: "SQL is a standardized declarative programming language used to manage, query, and manipulate relational database management systems.",
      explanation: "SQL allows developers to perform CRUD operations using commands grouped into DDL (Data Definition Language like CREATE, ALTER) and DML (Data Manipulation Language like SELECT, INSERT, UPDATE, DELETE). Queries execute in a specific order: FROM -> JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY.",
      example: "SELECT name, score FROM students WHERE score > 85 ORDER BY score DESC;",
      formulas: "Execution Order: FROM -> WHERE -> SELECT -> LIMIT.",
      diagram: "graph TD\n  FROM[1. FROM Table / JOIN] --> WHERE[2. WHERE Filter]\n  WHERE --> GROUP[3. GROUP BY Groups]\n  GROUP --> SELECT[4. SELECT Columns]\n  SELECT --> ORDER[5. ORDER BY Sort]",
      relatedTopics: ['Normalization (1NF, 2NF, 3NF, BCNF)', 'ACID Transactions'],
    },
    'normalization (1nf, 2nf, 3nf, bcnf)': {
      definition: "Normalization is the systematic process of structuring database tables to eliminate redundant data and prevent insertion, update, and deletion anomalies.",
      explanation: "Normalization progresses through normal forms: 1NF (atomic values, no repeating groups), 2NF (1NF + no partial dependencies on primary key), 3NF (2NF + no transitive dependencies), and BCNF (Boyce-Codd Normal Form: for every dependency X -> Y, X must be a super key). Each stage resolves anomalies by splitting tables.",
      example: "Decomposing an 'EmployeeProject' table into separate 'Employees' and 'Projects' tables to avoid redundant manager names.",
      formulas: "BCNF Requirement: If X -> Y, then X is a superkey.",
      diagram: "graph TD\n  Raw[Raw Data] --> NF1[1NF: Atomic Columns]\n  NF1 --> NF2[2NF: Remove Partial Key Dependencies]\n  NF2 --> NF3[3NF: Remove Transitive Dependencies]\n  NF3 --> BCNF[BCNF: X->Y implies X is Super Key]",
      relatedTopics: ['SQL (Structured Query Language)', 'ACID Transactions'],
    },
    'acid transactions': {
      definition: "ACID transactions are a set of properties (Atomicity, Consistency, Isolation, Durability) that guarantee database transactions are processed reliably.",
      explanation: "Atomicity ensures 'all-or-nothing' execution (if one part fails, the transaction is rolled back). Consistency ensures database integrity is maintained before and after execution. Isolation keeps concurrent transactions from interfering. Durability guarantees committed changes survive system crashes.",
      example: "A bank transfer debiting $100 from Account A and crediting $100 to Account B. If the credit fails, the debit is rolled back.",
      formulas: "ACID = Atomicity + Consistency + Isolation + Durability.",
      diagram: "graph TD\n  Start[Start Transaction] --> Read[Read/Write Operations]\n  Read --> Commit{Success?}\n  Commit -->|Yes| Save[Commit to Disk: Durability]\n  Commit -->|No| Rollback[Rollback Changes: Atomicity]",
      relatedTopics: ['SQL (Structured Query Language)', 'B-Trees & Indexing'],
    },
    'b-trees & indexing': {
      definition: "B-Trees & Indexing are data structures and lookup mechanisms used to speed up data retrieval operations in database systems.",
      explanation: "An index is a pointer structure referencing rows. A B-Tree (Balanced Tree) is a self-balancing tree search structure that maintains sorted data and allows logarithmic time searches, insertions, and deletions. B-Trees minimize disk I/O reads by grouping multiple keys in a single node.",
      example: "Using a primary key index on 'User_ID' allows the database to locate user profile records in O(log N) operations instead of scanning millions of rows sequentially.",
      formulas: "Search Time: O(log N) vs Linear scan O(N).",
      diagram: "graph TD\n  Root[Root Node: Key 50] --> Left[Left Child: Keys 10, 30]\n  Root --> Right[Right Child: Keys 70, 90]\n  Left --> Leaves1[Leaves: <10, 10-30, >30]\n  Right --> Leaves2[Leaves: 50-70, 70-90, >90]",
      relatedTopics: ['ACID Transactions', 'DBMS Architecture'],
    },

    // --- MICROPROCESSOR 8086 ---
    '8086 cpu architecture': {
      definition: "The 8086 CPU Architecture is the internal design of Intel's 16-bit microprocessor, split into the Bus Interface Unit (BIU) and the Execution Unit (EU).",
      explanation: "The 8086 separates CPU execution from memory bus cycles. The BIU handles instruction fetching, address calculations, and prefetching instructions into a 6-byte instruction queue. The EU decodes and executes instructions using General Purpose Registers, index registers, and the Arithmetic Logic Unit (ALU). This separation allows parallel fetch-execute pipelining.",
      example: "While the Execution Unit (EU) is multiplying two registers, the Bus Interface Unit (BIU) fetches the next instruction bytes from memory.",
      formulas: "8086 Components: BIU (Prefetch Queue, CS/DS/SS/ES) + EU (ALU, AX/BX/CX/DX, Flags).",
      diagram: "graph LR\n  BIU[Bus Interface Unit: Fetches Code] -->|6-Byte Queue| EU[Execution Unit: Decodes/Executes]\n  EU -->|Read/Write Data| RAM[System Memory]",
      relatedTopics: ['Registers & Addressing', 'Memory Segmentation'],
    },
    'registers & addressing': {
      definition: "Registers are high-speed storage locations within the CPU used to temporarily hold data, addresses, and status flags during execution.",
      explanation: "The 8086 contains 14 registers: General Purpose (AX, BX, CX, DX), Pointer (SP, BP), Index (SI, DI), Segment (CS, DS, SS, ES), and the IP & Flags registers. Addressing modes (Direct, Register Indirect, Indexed, Based Indexed) define how the operand physical address is calculated.",
      example: "The instruction 'MOV AX, [BX+SI]' uses Based Indexed Addressing to load a word into the AX register using base BX and index SI.",
      formulas: "Effective Address (EA) = Base + Index + Displacement.",
      diagram: "graph TD\n  AX[AX: Accumulator] --- BX[BX: Base Index]\n  CX[CX: Counter] --- DX[DX: Data Register]\n  SP[SP/BP: Stack/Base Pointers] --- SI[SI/DI: Source/Dest Indexes]",
      relatedTopics: ['8086 CPU Architecture', 'Memory Segmentation'],
    },
    'memory segmentation': {
      definition: "Memory Segmentation is the division of memory into logical segments of up to 64KB, allowing 16-bit registers to address a 1MB physical memory space.",
      explanation: "The 8086 uses a segment-offset addressing scheme to address 1MB of RAM with 16-bit registers. The BIU calculates the 20-bit physical address by shifting the Segment Register value left by 4 bits (multiplying by 16) and adding the 16-bit Offset Register value.",
      example: "If CS = 1000H and IP = 0020H, the physical address is calculated as 10000H + 0020H = 10020H.",
      formulas: "Physical Address (20-bit) = (Segment Register * 16) + Offset Register.",
      diagram: "graph TD\n  Seg[Segment Register: 1000H] -->|Shift Left 4 bits| Base[10000H]\n  Off[Offset Register: 0020H] --> Add[ADD Engine]\n  Base --> Add\n  Add --> PA[20-Bit Physical Address: 10020H]",
      relatedTopics: ['8086 CPU Architecture', 'BIU & EU Execution'],
    },
    'biu & eu execution': {
      definition: "BIU and EU execution refers to the parallel split-unit architecture of the 8086 microprocessor that enables instruction-level pipelining.",
      explanation: "The Bus Interface Unit (BIU) and Execution Unit (EU) work independently. The BIU prefetches up to 6 bytes of instruction code from memory and stores them in the queue. The EU decodes and runs these instructions. If the EU needs to write data to memory, the BIU suspends prefetching to execute the write cycle, keeping bus usage highly optimized.",
      example: "Pipelined execution in 8086 where instruction fetching overlap occurs concurrently with arithmetic execution.",
      formulas: "Pipeline Depth: 6 Bytes Prefetch Queue.",
      diagram: "graph TD\n  BIU[BIU: Prefetch Instructions] -->|Queue: 6 Bytes| EU[EU: Decode & Execute]\n  EU -->|Request Bus Cycle| BIU",
      relatedTopics: ['8086 CPU Architecture', 'Memory Segmentation'],
    },
    'instruction set & assembly': {
      definition: "The 8086 Instruction Set is the collection of low-level assembly commands used to program the microprocessor, categorized into data transfer, logic, arithmetic, and control flow.",
      explanation: "Assembly coding for the 8086 involves moving values using data transfer instructions (MOV, PUSH, POP), performing math (ADD, SUB, MUL, DIV), logic (AND, OR, XOR), and loops or branches (JMP, JZ, JNZ, LOOP). These translate directly to machine codes executed by the EU.",
      example: "MOV CX, 5 \nSTART: DEC CX \nJNZ START ; Loop executing 5 times.",
      formulas: "Syntax: Instruction Destination, Source.",
      diagram: "graph TD\n  Init[MOV CX, 0005H] --> Loop[DEC CX: Decrement Count]\n  Loop --> Jump{CX == 0?}\n  Jump -->|No| Loop\n  Jump -->|Yes| Exit[Exit Loop]",
      relatedTopics: ['Registers & Addressing', 'Interrupt Handling'],
    },
    'interrupts handling': {
      definition: "Interrupt Handling is the hardware or software mechanism that temporarily suspends normal execution to process a high-priority service routine.",
      explanation: "Upon receiving an interrupt, the 8086 pushes the Flags register, CS, and IP onto the stack. It then reads the 4-byte starting address of the Interrupt Service Routine (ISR) from the Interrupt Vector Table (IVT) located in the first 1KB of memory (addresses 00000H to 003FFH). After ISR execution (using IRET), it resumes the original program.",
      example: "Pressing a key on the keyboard triggers a hardware interrupt (INT 9) that executes BIOS key storage routines before returning control to the OS.",
      formulas: "IVT Entry Address = Interrupt Vector Number * 4.",
      diagram: "graph TD\n  Main[Main Program Execution] -->|Interrupt Triggered| Push[Push Flags, CS, IP to Stack]\n  Push --> GetISR[Fetch ISR Address from IVT]\n  GetISR --> ExecISR[Execute ISR code]\n  ExecISR -->|IRET| Pop[Pop Flags, CS, IP]\n  Pop --> Main",
      relatedTopics: ['8086 CPU Architecture', 'Instruction Set & Assembly'],
    },

    // --- LINEAR ALGEBRA ---
    'linear algebra': {
      definition: "Linear Algebra is the branch of mathematics concerning vector spaces, linear mappings, and systems of linear equations.",
      explanation: "Linear Algebra forms the foundation of modern data science, graphics, and machine learning. It covers vector spaces, matrices (representing linear maps), systems of linear equations, determinants, eigenvalues/eigenvectors, and inner product spaces.",
      example: "In computer graphics, 3D coordinate rotations and scaling operations are computed using 4x4 coordinate transformation matrices.",
      formulas: "Matrix System: A x = b.",
      diagram: "graph TD\n  Spaces[Vector Spaces] --> Maps[Linear Transformations]\n  Maps --> Matrices[Matrices & Operations]\n  Matrices --> Systems[Systems of Linear Equations]",
      relatedTopics: ['Matrices & Systems', 'Vectors & Spaces'],
    },
    'matrices & systems': {
      definition: "Matrices & Systems represents the representation of systems of linear equations as rectangular arrays of coefficients to perform systematic reduction and solving.",
      explanation: "Systems of linear equations can be represented as AX = B. These systems are analyzed using augmented matrices and solved via Gaussian Elimination to Row Echelon Form (REF) or Reduced Row Echelon Form (RREF). Systems can have a unique solution, infinitely many solutions, or no solution (inconsistent).",
      example: "A system of 3 equations with 3 variables solved using an augmented matrix and Gaussian elimination.",
      formulas: "REF/RREF, Augmented Matrix: [A | B].",
      diagram: "graph TD\n  Eq[Equations: Ax = b] --> Aug[Augmented Matrix [A|b]]\n  Aug --> Gauss[Gaussian Elimination: REF]\n  Gauss --> Back[Back Substitution / RREF] --> Sol[Unique / Infinite / No Solution]",
      relatedTopics: ['Linear Algebra', 'Linear Transformations'],
    },
    'vectors & spaces': {
      definition: "Vectors and Spaces defines elements representing magnitude and direction, and the algebraic spaces (vector spaces) that contain them.",
      explanation: "A vector space V over a field F is a set of elements (vectors) closed under addition and scalar multiplication, satisfying 8 axioms. Subspaces are subsets that are also vector spaces. Key concepts include linear independence, spanning sets, and bases (minimal spanning sets).",
      example: "The 3D space R^3 is a vector space spanned by the standard basis vectors i(1,0,0), j(0,1,0), and k(0,0,1).",
      formulas: "Linear Combination: c1 v1 + c2 v2 + ... + cn vn.",
      diagram: "graph LR\n  Set[Set of Vectors] --> Span{Spans Space?}\n  Span -->|Yes| LinInd{Linearly Independent?}\n  LinInd -->|Yes| Basis[Basis of Vector Space]",
      relatedTopics: ['Linear Algebra', 'Linear Transformations'],
    },
    'linear transformations': {
      definition: "A Linear Transformation is a mapping between two vector spaces that preserves the operations of vector addition and scalar multiplication.",
      explanation: "A transformation T: V -> W is linear if T(u + v) = T(u) + T(v) and T(c u) = c T(u). Every linear transformation between finite-dimensional spaces can be represented as multiplication by a matrix. Transformations include rotations, reflections, scaling, and projections.",
      example: "T(x, y) = (2x, 2y) is a linear transformation representing a uniform scaling mapping by factor 2.",
      formulas: "T(u + v) = T(u) + T(v), T(k u) = k T(u).",
      diagram: "graph TD\n  V[Vector in Space V] -->|Apply Map T| W[Vector in Space W]\n  Matrix[Representation Matrix A] -->|A * V| W",
      relatedTopics: ['Matrices & Systems', 'Eigenvalues & Eigenvectors'],
    },
    'eigenvalues & eigenvectors': {
      definition: "Eigenvalues and Eigenvectors are scalars and non-zero vectors that satisfy the characteristic equation where a linear transformation operates as simple scaling.",
      explanation: "For a square matrix A, an eigenvector x and its corresponding eigenvalue λ satisfy the equation Ax = λx. The eigenvector's direction remains unchanged after transformation; it is only scaled by factor λ. Eigenvalues are found by solving the characteristic equation: det(A - λI) = 0.",
      example: "In Principal Component Analysis (PCA), eigenvectors identify the directions of maximum variance in data, while eigenvalues show their magnitude.",
      formulas: "Characteristic Equation: det(A - λ I) = 0, Ax = λ x.",
      diagram: "graph TD\n  MatrixA[Matrix A] --> Char[Solve det(A - λI) = 0]\n  Char --> Lambda[Eigenvalues: λ]\n  Lambda --> Vector[Solve (A - λI)x = 0] --> EigVector[Eigenvectors: x]",
      relatedTopics: ['Linear Transformations', 'Linear Algebra'],
    },

    // --- PROGRAMMING PRINCIPLES ---
    'variables & scope': {
      definition: "Variables and Scope defines named memory storage locations and the boundaries of accessibility of variables within source code.",
      explanation: "Variables store data. Scope determines the visibility and lifetime of these variables. In block-scoped languages (like ES6, Java), variables declared in a block `{}` are only visible inside it. Stack memory stores local scope variables and call frames, while heap memory stores dynamically allocated reference objects.",
      example: "A local variable declared inside a function cannot be accessed outside that function, representing local functional scope.",
      formulas: "Memory: Stack (Static, local) vs Heap (Dynamic, references).",
      diagram: "graph TD\n  Code[Variable Declaration] --> Scope{Check Scope}\n  Scope -->|Block/Local| Stack[Allocated on Stack: Fast & Temp]\n  Scope -->|Dynamic Object| Heap[Allocated on Heap: Garbage Collected]",
      relatedTopics: ['Functions & Recursion', 'Arrays & Lists'],
    },
    'functions & recursion': {
      definition: "Functions are reusable blocks of code, and Recursion is a programming technique where a function calls itself to solve smaller sub-problems.",
      explanation: "Functions accept inputs (parameters) and return outputs. Recursion involves a function solving a problem by calling itself with reduced inputs. Every recursive function must contain a base case (to terminate recursion) and a recursive step. Call frames are pushed onto the Call Stack for each recursive call.",
      example: "Calculating factorials: \nfact(n) = n == 1 ? 1 : n * fact(n-1);",
      formulas: "Structure: fact(n) = n * fact(n-1) with Base Case n <= 1.",
      diagram: "graph TD\n  Call[Call fact(3)] --> Step2[3 * fact(2)]\n  Step2 --> Step1[2 * fact(1)]\n  Step1 --> Base[Base Case fact(1) = 1] --> Calc[Return 1]\n  Calc --> Calc2[Return 2 * 1 = 2] --> Calc3[Return 3 * 2 = 6]",
      relatedTopics: ['Variables & Scope', 'Arrays & Lists'],
    },
    'arrays & lists': {
      definition: "Arrays are contiguous blocks of memory holding elements of the same type, while Lists are abstract data structures that can be contiguous or linked.",
      explanation: "Arrays offer O(1) constant-time indexing but are fixed in size and slow for insertions/deletions O(N). Linked Lists (singly, doubly) consist of nodes containing data and pointers. Linked lists allow O(1) insertions but require sequential O(N) traversals to search values.",
      example: "An Array holding student grades in consecutive memory slots versus a Linked List representing a queue of print jobs.",
      formulas: "Index Lookup: Array O(1) vs Linked List O(N).",
      diagram: "graph LR\n  Head[Head: Node 10] --> Next1[Node 20] --> Next2[Node 30] --> Null[Null]",
      relatedTopics: ['Variables & Scope', 'Binary Search Trees'],
    },
    'binary search trees': {
      definition: "A Binary Search Tree (BST) is a hierarchical node-based binary tree data structure where left child values are smaller and right child values are larger than the parent node.",
      explanation: "BST nodes have at most two children. The left subtree contains keys less than the node's key, and the right subtree contains keys greater. This ordering allows search, insertion, and deletion operations in logarithmic O(log N) average time, though it can degenerate to linear O(N) if unbalanced.",
      example: "A balanced BST containing numbers 10, 20, 30 where 20 is root, 10 is left child, and 30 is right child.",
      formulas: "Search Complexity: Average O(log N), Worst-case O(N).",
      diagram: "graph TD\n  Root((Root: 20)) --> Left((Left: 10))\n  Root --> Right((Right: 30))\n  Left --> Leaf1((Leaf: 5))\n  Right --> Leaf2((Leaf: 25))",
      relatedTopics: ['Arrays & Lists', 'Algorithms (Sorting & Searching)'],
    },
    'algorithms (sorting & searching)': {
      definition: "Algorithms are step-by-step computational procedures used for sorting data in order or searching for elements within structures.",
      explanation: "Algorithms arrange items: O(N^2) bubble/insertion sort versus O(N log N) divide-and-conquer mergesort and quicksort. Searching algorithms locate items: linear search O(N) versus binary search O(log N) which requires pre-sorted array structures.",
      example: "Binary search repeatedly halving a sorted list to locate an item in logarithmic steps.",
      formulas: "Binary Search: O(log N) complexity.",
      diagram: "graph TD\n  Array[Sorted Array] --> Mid{Compare Midpoint}\n  Mid -->|Match| Success[Item Found]\n  Mid -->|Greater| SearchRight[Search Right Half]\n  Mid -->|Lesser| SearchLeft[Search Left Half]",
      relatedTopics: ['Binary Search Trees', 'Arrays & Lists'],
    }
  };

  const matched = library[normLabel];
  if (matched) {
    return {
      definition: matched.definition,
      explanation: matched.explanation,
      example: matched.example,
      formulas: matched.formulas,
      diagram: matched.diagram,
      relatedTopics: matched.relatedTopics,
      interviewQuestions: [
        { 
          question: `What is the core definition and primary purpose of ${label}?`, 
          answer: matched.definition + " " + matched.example 
        },
        { 
          question: `Can you briefly explain how ${label} functions under execution conditions?`, 
          answer: matched.explanation 
        }
      ],
      quizQuestions: [
        {
          question: `Which of the following best defines the primary concept of ${label}?`,
          options: [matched.definition, 'A temporary placeholder memory index', 'An unrelated security verification layer', 'None of the above'],
          correctAnswerIndex: 0,
          explanation: `Correct: ${matched.definition}`
        }
      ]
    };
  }

  return {
    definition: `Detailed conceptual representation of ${label}.`,
    explanation: `This is an on-demand tutorial for the concept **${label}**. In a live database environment, this profile includes detailed sub-concepts, step-by-step mechanisms, real-world examples, and a structural diagram of the topic.`,
    example: `A practical application of ${label} is standard in software design patterns to modularize components, manage memory states, and optimize execution flow.`,
    formulas: `Complexity: O(log N) or O(N) depending on execution constraints.`,
    diagram: `graph TD\n  A[${label}] --> B(Explore Subtopics)\n  A --> C(Study Examples)\n  A --> D(Test Knowledge)`,
    relatedTopics: ['Prerequisite Concepts', 'Advanced Subtopics', 'Practical Implementations'],
    interviewQuestions: [
      { question: `What is the primary trade-off of using ${label}?`, answer: `Usually involves balancing memory consumption with computation time (e.g. indexing structures vs processing overhead).` },
      { question: `Can you explain a scenario where ${label} is used?`, answer: `Standard compilation systems, database indexing engines, and resource schedulers utilize it to manage state.` }
    ],
    quizQuestions: [
      {
        question: `Which of the following describes the core goal of ${label}?`,
        options: ['Structuring system redundancy', 'Maximizing storage limits', 'Optimizing query execution speeds', 'Handling authentication checks'],
        correctAnswerIndex: 2,
        explanation: `${label} coordinates structural layouts to reduce access lookups and improve speeds.`
      }
    ]
  };
}
