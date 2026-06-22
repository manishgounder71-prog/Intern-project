import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const extractTextFromFile = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File does not exist on disk.');
  }

  const fileBuffer = fs.readFileSync(filePath);

  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: fileBuffer });
    const result = await parser.getText();
    return result.text;
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const data = await mammoth.extractRawText({ buffer: fileBuffer });
    return data.value;
  } else if (mimeType === 'text/plain') {
    return fileBuffer.toString('utf-8');
  } else {
    // Fallback: read buffer as text
    return fileBuffer.toString('utf-8');
  }
};
