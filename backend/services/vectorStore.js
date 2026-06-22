import DocChunk from '../../database/models/DocChunk.js';

// Cosine similarity computation
export const cosineSimilarity = (vecA, vecB) => {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
};

/**
 * Searches for text chunks semantically similar to a query embedding.
 * Supports filtering by a specific document or searching across all user's documents.
 */
export const searchSimilarChunks = async ({ ownerId, documentId, queryEmbedding, limit = 4 }) => {
  try {
    const query = { owner: ownerId };
    if (documentId) {
      query.document = documentId;
    }

    // Fetch candidate chunks from database
    // Select chunk text, ID, and embedding values
    const chunks = await DocChunk.find(query).select('textContent document chunkIndex embedding');

    if (!chunks || chunks.length === 0) {
      return [];
    }

    // Map chunks to include similarity scores
    const scoredChunks = chunks.map(chunk => {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        _id: chunk._id,
        textContent: chunk.textContent,
        document: chunk.document,
        chunkIndex: chunk.chunkIndex,
        score
      };
    });

    // Sort by score descending and take top N
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, limit);
  } catch (error) {
    console.error('Error matching semantic chunks:', error);
    throw error;
  }
};

/**
 * Performs a keyword-based search on the document text chunks to extract
 * an explanation fallback when OpenRouter API rate limit is exceeded.
 */
export const getLocalRAGFallbackDetails = async (nodeLabel, documentId) => {
  try {
    const chunks = await DocChunk.find({ document: documentId });
    if (!chunks || chunks.length === 0) {
      return {
        definition: `Detailed conceptual representation of ${nodeLabel}.`,
        explanation: `Please refer to the study material for more details on ${nodeLabel}.`,
        example: 'N/A',
        formulas: 'N/A',
        relatedTopics: [],
        interviewQuestions: []
      };
    }

    const labelLower = nodeLabel.toLowerCase();
    const rankedChunks = chunks.map(chunk => {
      const contentLower = chunk.textContent.toLowerCase();
      let count = 0;
      let pos = contentLower.indexOf(labelLower);
      while (pos !== -1) {
        count++;
        pos = contentLower.indexOf(labelLower, pos + 1);
      }
      return { chunk, count };
    }).filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    let explanation = '';
    let example = '';

    if (rankedChunks.length > 0) {
      explanation = rankedChunks[0].chunk.textContent;
      if (rankedChunks.length > 1) {
        example = `From document context: "... ${rankedChunks[1].chunk.textContent.substring(0, 150)}..."`;
      }
    } else {
      explanation = chunks[0].textContent;
    }

    if (explanation.length > 400) {
      explanation = explanation.substring(0, 400) + '...';
    }

    return {
      definition: `Detailed conceptual representation of ${nodeLabel}.`,
      explanation: explanation || `Please refer to the uploaded document sections for more details on ${nodeLabel}.`,
      example: example || `Context from document: ${explanation.substring(0, 150)}`,
      formulas: 'Refer to document text.',
      diagram: `graph TD\n  A[${nodeLabel}] --> B(Explore Subtopics)\n  A --> C(Study Examples)\n  A --> D(Test Knowledge)`,
      relatedTopics: [],
      interviewQuestions: [
        {
          question: `What is the significance of ${nodeLabel} in this context?`,
          answer: `It is discussed in the study material: "${explanation.substring(0, 120)}..."`
        }
      ]
    };
  } catch (error) {
    console.error('Error generating local RAG fallback:', error);
    return {
      definition: `Detailed conceptual representation of ${nodeLabel}.`,
      explanation: `Failed to retrieve details locally. Please check your uploaded document.`,
      example: 'N/A',
      formulas: 'N/A',
      relatedTopics: [],
      interviewQuestions: []
    };
  }
};

