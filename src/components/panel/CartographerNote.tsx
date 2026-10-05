import { NoteCard } from '@/components/panel/NoteCard';

/** Aviso de geometria aproximada. Um parágrafo só: na prévia do mobile ele
 * ocupava a altura inteira e escondia os números-chave. */
export function CartographerNote() {
  return (
    <NoteCard className="mb-4 px-3 py-2">
      <p className="cv-note-body">
        <span className="cv-note-title not-italic">✎ Nota do cartógrafo:</span> limites
        aproximados, sem confirmação em cadastro oficial.
      </p>
    </NoteCard>
  );
}

/** Zona rural do distrito-sede (`cd_unidade` com sufixo `-rural` no ETL):
 * dado do Censo válido, mas a unidade não é um distrito nem um bairro oficial. */
export function RuralNote() {
  return (
    <NoteCard className="mb-4 px-3 py-2">
      <p className="cv-note-body">
        <span className="cv-note-title not-italic">Região rural sem distrito definido:</span>{' '}
        setores rurais do distrito-sede que não pertencem a nenhum bairro nem a outro distrito.
      </p>
    </NoteCard>
  );
}
