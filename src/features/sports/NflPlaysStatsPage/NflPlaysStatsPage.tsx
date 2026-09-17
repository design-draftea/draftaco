// Rota de atalho para o bottom sheet de Jogadas e Estatísticas da NFL.
// No app ele só existe dentro do evento ao vivo, atrás de alguns cliques; aqui
// ele abre direto, para conferir o campinho e o feed sem percorrer o fluxo.
import { NflPlaysStatsBottomSheet } from '../../../components/BottomSheet'
import './NflPlaysStatsPage.css'

export function NflPlaysStatsPage({ onClose }: { onClose?: () => void }) {
  return (
    <main className="nfl-plays-stats-page">
      <NflPlaysStatsBottomSheet isOpen={true} onClose={() => onClose?.()} />
    </main>
  )
}
