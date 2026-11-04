import { llmsFiles, textResponse } from '@/guide/llms';

export function GET() {
  return textResponse(llmsFiles()['llms.txt'], 'text/markdown');
}
