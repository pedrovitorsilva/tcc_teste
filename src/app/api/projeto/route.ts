import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/projeto
 * Serve o PDF do projeto de pesquisa em inline (abre no navegador, não baixa).
 */
export async function GET() {
  try {
    const filePath = join(
      process.cwd(),
      'public/docs/Projeto_Pesquisa_Pedro_Silva_PGDW2026.pdf'
    );
    const buffer = await readFile(filePath);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          'inline; filename="Projeto_Pesquisa_Pedro_Silva_PGDW2026.pdf"',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Erro ao servir PDF:', error);
    return new Response('PDF não encontrado', { status: 404 });
  }
}
