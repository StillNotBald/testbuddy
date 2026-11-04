import { llmsFiles, textResponse } from '@/guide/llms';

export function GET() {
  return textResponse(llmsFiles()['llms-full.txt'], 'text/markdown');
}
