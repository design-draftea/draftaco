// Card da tela Entradas, do nó Figma 1993:6822.
// O miolo — as linhas de seleção — é o mesmo do recibo da tela de sucesso, via
// `betSuccessSelections`. O que é próprio deste card é a moldura: o cabeçalho com
// recolher e compartilhar, o botão de encerrar e o rodapé com data e código.
// Recolhido (nó Figma 4125:63570, arquivo One App BR), o card mostra só o cabeçalho e
// uma fileira com um círculo por escolha.
// Encerrar aposta, pelos prints do app da Draftea: o botão vira Cancelar/Confirmar,
// Confirmar carrega por 2s, o card mostra "Aposta encerrada por" com a tag ENCERRADA e,
// depois, sai de Próximas para Encerradas. As etapas vêm de `useMyEntries`.
import { useState, type CSSProperties } from 'react'

import badgeGanhador from '../../../assets/badgeGanhador.svg'
import iconCircleCheckSuccess from '../../../assets/iconsDraftaco/iconCircleCheckSuccess.svg'
import iconCircleXError from '../../../assets/iconsDraftaco/iconCircleXError.svg'
import entryCardLight from '../../../assets/entryCardLight.svg'
import chevronUp from '../../../assets/iconsDraftaco/chevronUp.svg'
import iconEntryShare from '../../../assets/iconsDraftaco/iconEntryShare.svg'
import {
  BetSuccessOddOverride,
  BetSuccessSelectionAvatar,
  BetSuccessSelectionGroupRow,
} from '../../betslip/BetSuccessPage/betSuccessSelections'
import { getFinishedSelectionResult } from '../../betslip/BetSuccessPage/selectionResult'
import {
  getPlayerSelectionValueLabel,
  getSelectionTitle,
  groupSelectionsByEvent,
} from '../../betslip/BetslipPageV2/betslipDisplayUtils'
import type { EntryOutcome, EntrySummary } from '../../../data/entries'
import type { BetslipSelection } from '../../../shared/hooks/betslipUtils'

// Tags das entradas decididas, as mesmas do card do Pulse. A de ganhou tem a arte
// própria do Pulse por baixo do texto; as demais são uma pílula neutra, e a de
// encerrada é branca, como no nó Figma 4125:63570.
const rotuloDoResultado: Record<Exclude<EntryOutcome, 'won'>, string> = {
  lost: 'NÃO GANHOU',
  canceled: 'CANCELADO',
  'cashed-out': 'ENCERRADA',
}

function EntryOutcomeTag({ outcome }: { outcome: EntryOutcome }) {
  if (outcome === 'won') {
    return (
      <span className="entry-card__winner" aria-label="GANHOU!">
        <img src={badgeGanhador} alt="" aria-hidden="true" />
        <strong aria-hidden="true">GANHOU!</strong>
      </span>
    )
  }

  return (
    <span
      className={[
        'entry-card__status',
        outcome === 'cashed-out' ? 'entry-card__status--cashed-out' : '',
      ].filter(Boolean).join(' ')}
    >
      {rotuloDoResultado[outcome]}
    </span>
  )
}

// Nome da escolha para o leitor de tela, já que o círculo do card recolhido é só imagem.
// O rótulo sozinho às vezes é só a linha ("2.5+"), então o jogador ou o mercado vão junto.
// Jogador e valor vêm dos mesmos auxiliares que a linha do card aberto usa.
const rotuloDaEscolha = (selecao: BetslipSelection) => (
  selecao.selectionType === 'player'
    ? [getSelectionTitle(selecao), getPlayerSelectionValueLabel(selecao)].filter(Boolean).join(' ')
    : `${selecao.marketLabel}: ${selecao.label}`
)

// O desenho usa dois pesos no valor: o símbolo em Bold 16 e o número em Black 18.
const separarMoeda = (valor: string) => {
  const casado = valor.match(/^(\D+)\s*(.+)$/)

  return casado ? { simbolo: casado[1].trim(), numero: casado[2] } : { simbolo: '', numero: valor }
}

interface EntryCardProps {
  entry: EntrySummary
  defaultCollapsed?: boolean
  onCashOut?: (entryId: string) => void
}

export function EntryCard({ entry, defaultCollapsed = false, onCashOut }: EntryCardProps) {
  const [estaRecolhido, setEstaRecolhido] = useState(defaultCollapsed)
  // Quando o encerramento chega em `settled`, o card se recolhe sozinho. O ajuste é feito
  // durante a renderização, comparando com a etapa anterior, e não num efeito; depois
  // disso a pessoa ainda pode abrir o card de novo.
  const [etapaAnterior, setEtapaAnterior] = useState(entry.cashOutStatus)
  if (entry.cashOutStatus !== etapaAnterior) {
    setEtapaAnterior(entry.cashOutStatus)
    if (entry.cashOutStatus === 'settled') setEstaRecolhido(true)
  }
  // Pedido de confirmação do encerramento: só vive no card, enquanto a pessoa decide.
  const [estaConfirmandoEncerramento, setEstaConfirmandoEncerramento] = useState(false)
  const grupos = groupSelectionsByEvent(entry.selections)
  const estaCancelada = entry.outcome === 'canceled'
  const estaEncerrando = entry.cashOutStatus === 'processing'
  // Encerrada: ainda em Próximas, com a confirmação na tela, ou já em Encerradas.
  const foiEncerrada = entry.cashOutStatus === 'closed'
    || entry.cashOutStatus === 'settled'
    || entry.cashOutStatus === 'leaving'
    || entry.outcome === 'cashed-out'
  const resultado: EntryOutcome | undefined = foiEncerrada ? 'cashed-out' : entry.outcome
  // Encerrada, o valor do topo passa a ser o que a pessoa recebeu.
  const valorDoTopo = foiEncerrada && entry.cashOutValueLabel ? entry.cashOutValueLabel : entry.potentialWinLabel
  const { simbolo, numero } = separarMoeda(valorDoTopo)
  const linhas = grupos.map((grupo) => (
    <BetSuccessSelectionGroupRow group={grupo} key={grupo.eventId} />
  ))

  return (
    // A casca anima a saída do card de Próximas: a altura fecha e o espaço some junto.
    <div className={`entry-card-slot${entry.cashOutStatus === 'leaving' ? ' entry-card-slot--leaving' : ''}`}>
      <div className="entry-card-slot__inner">
        <article
          className={[
            'entry-card',
            resultado ? `entry-card--${resultado}` : '',
            estaRecolhido ? 'entry-card--collapsed' : '',
          ].filter(Boolean).join(' ')}
          data-node-id="1993:6822"
        >
          <img className="entry-card__light" src={entryCardLight} alt="" aria-hidden="true" />

          <header className="entry-card__header">
            <button
              className="entry-card__collapse"
              type="button"
              aria-expanded={!estaRecolhido}
              aria-label={estaRecolhido ? 'Expandir aposta' : 'Recolher aposta'}
              onClick={() => setEstaRecolhido((anterior) => !anterior)}
            >
              <img src={chevronUp} alt="" aria-hidden="true" />
            </button>

            <span className="entry-card__divider" aria-hidden="true" />

            <div className="entry-card__header-body">
              <div className="entry-card__title">
                <span className="entry-card__payout">
                  <span>{simbolo}</span>
                  <strong>{numero}</strong>
                </span>
                {/* Encerrada, a entrada troca o "Ganho potencial" pela tag do resultado,
                    como no card do Pulse. */}
                {resultado ? (
                  <EntryOutcomeTag outcome={resultado} />
                ) : (
                  <span className="entry-card__payout-label">Ganho potencial</span>
                )}
                <button className="entry-card__share" type="button" aria-label="Compartilhar aposta">
                  <img src={iconEntryShare} alt="" aria-hidden="true" />
                </button>
              </div>

              <div className="entry-card__meta">
                {/* Cancelada, o valor da entrada volta para a pessoa. Os rótulos vão
                    inteiros, com os dois-pontos, para a tradução casar a frase exata. */}
                <span>{estaCancelada ? 'Reembolso:' : 'Entrada:'} <strong>{entry.stakeLabel}</strong></span>
                <span>Odds: <strong>{entry.totalOddsLabel}</strong></span>
              </div>
            </div>
          </header>

          {/* Accordion: os dois estados ficam montados, cada um num painel que anima a
              altura; o que está fechado fica `inert`, fora do foco e do leitor de tela. */}
          <div
            className={`entry-card__panel${estaRecolhido ? '' : ' entry-card__panel--closed'}`}
            inert={!estaRecolhido}
          >
            <div className="entry-card__panel-inner">
              {/* A imagem de cada escolha é a mesma do avatar das linhas: foto do jogador,
                  escudo do time escolhido ou os dois escudos no empate. */}
              <ol className="entry-card__resume" aria-label="Escolhas da aposta">
                {entry.selections.map((selecao, indice) => {
                  // Jogo encerrado: anel e selo verdes na escolha certa, vermelhos na errada, com
                  // os mesmos ícones das linhas (nós Figma 1993:6893 e 1993:6923).
                  const resultadoDaEscolha = getFinishedSelectionResult(selecao)

                  return (
                    <li
                      className={[
                        'entry-card__resume-item',
                        selecao.selectionType === 'player' ? 'entry-card__resume-item--player' : '',
                        resultadoDaEscolha ? `entry-card__resume-item--${resultadoDaEscolha}` : '',
                      ].filter(Boolean).join(' ')}
                      key={selecao.id}
                      style={{ '--entry-card-resume-index': indice } as CSSProperties}
                    >
                      <BetSuccessSelectionAvatar selection={selecao} />
                      {resultadoDaEscolha ? (
                        <span className="entry-card__resume-badge" aria-hidden="true">
                          <img src={resultadoDaEscolha === 'hit' ? iconCircleCheckSuccess : iconCircleXError} alt="" />
                        </span>
                      ) : null}
                      <span className="entry-card__resume-label">
                        {rotuloDaEscolha(selecao)}
                        {resultadoDaEscolha === 'hit' ? ' (acertou)' : resultadoDaEscolha === 'miss' ? ' (errou)' : null}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>

          <div
            className={`entry-card__panel${estaRecolhido ? ' entry-card__panel--closed' : ''}`}
            inert={estaRecolhido}
          >
            <div className="entry-card__panel-inner">
              <div className="entry-card__selections">
                {/* Cancelada, cada seleção mostra a tag de cancelada no lugar da odd. */}
                {estaCancelada ? (
                  <BetSuccessOddOverride
                    override={<span className="entry-card__status entry-card__selection-status">CANCELADA</span>}
                  >
                    {linhas}
                  </BetSuccessOddOverride>
                ) : linhas}
              </div>

              {entry.cashOutValueLabel && entry.outcome !== 'cashed-out' ? (
                <div className="entry-card__actions">
                  {foiEncerrada ? (
                    <p className="entry-card__cash-out-done" role="status">
                      <img src={iconCircleCheckSuccess} alt="" aria-hidden="true" />
                      <span>Aposta encerrada por: {entry.cashOutValueLabel}</span>
                    </p>
                  ) : estaConfirmandoEncerramento || estaEncerrando ? (
                    <div className="entry-card__cash-out-confirm">
                      <button
                        className="entry-card__cash-out-cancel"
                        type="button"
                        disabled={estaEncerrando}
                        onClick={() => setEstaConfirmandoEncerramento(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        className={`entry-card__cash-out${estaEncerrando ? ' entry-card__cash-out--loading' : ''}`}
                        type="button"
                        disabled={estaEncerrando}
                        aria-busy={estaEncerrando}
                        onClick={() => onCashOut?.(entry.id)}
                      >
                        <span className="entry-card__cash-out-label">Confirmar: {entry.cashOutValueLabel}</span>
                        <span className="entry-card__cash-out-spinner" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="entry-card__cash-out"
                      type="button"
                      onClick={() => setEstaConfirmandoEncerramento(true)}
                    >
                      Encerrar aposta: {entry.cashOutValueLabel}
                    </button>
                  )}
                </div>
              ) : null}

              <footer className="entry-card__footer">
                <span>Criado: {entry.createdAtLabel}</span>
                <span className="entry-card__code">{entry.code}</span>
              </footer>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
